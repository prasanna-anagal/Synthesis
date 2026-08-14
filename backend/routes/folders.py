"""
Folder management routes — CRUD for subject folders.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from database import get_supabase_admin
from auth import get_current_user
from models.folder import FolderCreate, FolderUpdate, FolderResponse

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=list[FolderResponse])
async def list_folders(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """List all folders for the authenticated user."""
    response = (
        db.table("folders")
        .select("*, documents(count)")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    folders = []
    for row in (response.data or []):
        doc_count = 0
        if row.get("documents") and isinstance(row["documents"], list):
            doc_count = row["documents"][0].get("count", 0) if row["documents"] else 0
        folders.append(
            FolderResponse(
                id=row["id"],
                user_id=row["user_id"],
                name=row["name"],
                description=row.get("description"),
                document_count=doc_count,
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
        )
    return folders


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    payload: FolderCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Create a new folder."""
    now = datetime.utcnow().isoformat()
    folder_id = str(uuid.uuid4())
    response = (
        db.table("folders")
        .insert({
            "id": folder_id,
            "user_id": current_user["id"],
            "name": payload.name,
            "description": payload.description,
            "created_at": now,
            "updated_at": now,
        })
        .execute()
    )

    row = response.data[0] if response.data else {
        "id": folder_id,
        "user_id": current_user["id"],
        "name": payload.name,
        "description": payload.description,
        "created_at": now,
        "updated_at": now,
    }
    return FolderResponse(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        description=row.get("description"),
        document_count=0,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Get a single folder by ID."""
    response = (
        db.table("folders")
        .select("*")
        .eq("id", folder_id)
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Folder not found")

    row = response.data[0]
    return FolderResponse(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        description=row.get("description"),
        document_count=0,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.patch("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: str,
    payload: FolderUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Update folder name or description."""
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()

    response = (
        db.table("folders")
        .update(update_data)
        .eq("id", folder_id)
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Folder not found")

    row = response.data[0]
    return FolderResponse(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        description=row.get("description"),
        document_count=0,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Delete a folder and all its documents (cascade)."""
    db.table("folders").delete().eq("id", folder_id).eq("user_id", current_user["id"]).execute()
