"""
Document upload, management, and processing routes.
Handles: upload, processing (parse → embed → index), list, delete.
"""
import os
import uuid
import asyncio
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from fastapi.responses import JSONResponse
from database import get_supabase_admin
from auth import get_current_user
from models.document import DocumentResponse, DocumentStatus
from services.parser import parse_document
from services.embedder import index_document_chunks, delete_document_from_collection
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_TYPES = {"pdf", "docx", "txt"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def _get_file_type(filename: str) -> str:
    return Path(filename).suffix.lstrip(".").lower()


async def _process_document(
    document_id: str,
    folder_id: str,
    file_path: str,
    file_type: str,
    original_name: str,
    db,
):
    """Background task: parse → chunk → embed → index → update status."""
    now = datetime.utcnow().isoformat()
    try:
        # Update status to processing
        db.table("documents").update(
            {"status": DocumentStatus.PROCESSING, "updated_at": now}
        ).eq("id", document_id).execute()

        # Parse document into chunks
        chunks, page_count = parse_document(file_path, file_type)

        # Embed and index into ChromaDB
        chroma_ids = index_document_chunks(
            folder_id=folder_id,
            document_id=document_id,
            document_name=original_name,
            chunks=chunks,
        )

        # Store chunk metadata in Postgres
        chunk_records = [
            {
                "id": str(uuid.uuid4()),
                "document_id": document_id,
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "char_start": chunk.char_start,
                "char_end": chunk.char_end,
                "chroma_id": chroma_ids[i],
                "created_at": now,
            }
            for i, chunk in enumerate(chunks)
            if i < len(chroma_ids)
        ]

        if chunk_records:
            # Insert in batches of 100
            for i in range(0, len(chunk_records), 100):
                db.table("document_chunks").insert(chunk_records[i:i+100]).execute()

        # Mark as indexed
        db.table("documents").update(
            {
                "status": DocumentStatus.INDEXED,
                "page_count": page_count,
                "updated_at": datetime.utcnow().isoformat(),
            }
        ).eq("id", document_id).execute()

    except Exception as e:
        db.table("documents").update(
            {
                "status": DocumentStatus.ERROR,
                "error_message": str(e)[:500],
                "updated_at": datetime.utcnow().isoformat(),
            }
        ).eq("id", document_id).execute()


@router.post("/{folder_id}/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    folder_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Upload a document and trigger async processing (parse + embed)."""
    # Validate folder ownership
    folder = db.table("folders").select("id").eq("id", folder_id).eq("user_id", current_user["id"]).execute()
    if not folder.data:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Validate file type
    file_type = _get_file_type(file.filename or "")
    if file_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type '{file_type}' not supported. Use PDF, DOCX, or TXT.")

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50MB limit")

    # Save to disk
    upload_dir = Path(settings.upload_dir) / current_user["id"] / folder_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = str(upload_dir / safe_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    document_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    db.table("documents").insert({
        "id": document_id,
        "folder_id": folder_id,
        "user_id": current_user["id"],
        "filename": safe_filename,
        "original_name": file.filename,
        "file_path": file_path,
        "file_type": file_type,
        "file_size": len(content),
        "status": DocumentStatus.PENDING,
        "created_at": now,
        "updated_at": now,
    }).execute()

    # Trigger background processing
    background_tasks.add_task(
        _process_document,
        document_id=document_id,
        folder_id=folder_id,
        file_path=file_path,
        file_type=file_type,
        original_name=file.filename,
        db=db,
    )

    return {
        "document_id": document_id,
        "filename": file.filename,
        "status": DocumentStatus.PENDING,
        "message": "Document uploaded. Processing started.",
    }


@router.get("/{folder_id}", response_model=list[DocumentResponse])
async def list_documents(
    folder_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """List all documents in a folder."""
    response = (
        db.table("documents")
        .select("*")
        .eq("folder_id", folder_id)
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    return [
        DocumentResponse(
            id=row["id"],
            folder_id=row["folder_id"],
            user_id=row["user_id"],
            filename=row["original_name"],
            file_path=row["file_path"],
            file_type=row["file_type"],
            file_size=row["file_size"],
            page_count=row.get("page_count"),
            status=DocumentStatus(row["status"]),
            error_message=row.get("error_message"),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in (response.data or [])
    ]


@router.get("/{folder_id}/{document_id}/status")
async def get_document_status(
    folder_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Poll document processing status."""
    response = (
        db.table("documents")
        .select("id, status, error_message, page_count, updated_at")
        .eq("id", document_id)
        .eq("folder_id", folder_id)
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Document not found")

    return response.data[0]


@router.delete("/{folder_id}/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    folder_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Delete a document and remove its embeddings from ChromaDB."""
    # Verify ownership
    doc = (
        db.table("documents")
        .select("id, file_path")
        .eq("id", document_id)
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from ChromaDB
    try:
        delete_document_from_collection(folder_id, document_id)
    except Exception:
        pass  # Don't block deletion if ChromaDB fails

    # Remove file from disk
    try:
        file_path = doc.data[0].get("file_path")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass

    # Delete from DB
    db.table("documents").delete().eq("id", document_id).execute()
