"""
Knowledge graph routes — extract and cache concept graphs per folder.
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from database import get_supabase_admin
from auth import get_current_user
from services.graph_extractor import extract_graph_from_chunks

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/{folder_id}")
async def get_knowledge_graph(
    folder_id: str,
    force_refresh: bool = False,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Return knowledge graph for folder. Uses cache unless force_refresh=True."""
    folder = (
        db.table("folders")
        .select("id")
        .eq("id", folder_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not folder.data:
        raise HTTPException(status_code=404, detail="Folder not found")

    if not force_refresh:
        cache = (
            db.table("concept_graph_cache")
            .select("nodes_json, edges_json, updated_at")
            .eq("folder_id", folder_id)
            .execute()
        )
        if cache.data:
            c = cache.data[0]
            return {
                "nodes": json.loads(c["nodes_json"]) if isinstance(c["nodes_json"], str) else c["nodes_json"],
                "edges": json.loads(c["edges_json"]) if isinstance(c["edges_json"], str) else c["edges_json"],
                "cached": True,
                "updated_at": c["updated_at"],
            }

    from services.embedder import get_or_create_collection
    collection = get_or_create_collection(folder_id)

    try:
        all_data = collection.get(include=["documents", "metadatas"])
    except Exception:
        return {"nodes": [], "edges": [], "cached": False, "message": "Vector store not initialized"}

    if not all_data.get("documents"):
        return {"nodes": [], "edges": [], "cached": False, "message": "No indexed documents found"}

    chunks_with_meta = []
    for i, content in enumerate(all_data.get("documents", [])):
        meta = all_data["metadatas"][i] if all_data.get("metadatas") else {}
        chunks_with_meta.append({
            "content": content,
            "document_id": meta.get("document_id", ""),
            "document_name": meta.get("document_name", "Unknown"),
            "page_number": meta.get("page_number"),
        })

    graph = extract_graph_from_chunks(chunks_with_meta)

    now = datetime.utcnow().isoformat()
    nodes_json = json.dumps(graph["nodes"])
    edges_json = json.dumps(graph["edges"])

    existing = (
        db.table("concept_graph_cache")
        .select("id")
        .eq("folder_id", folder_id)
        .execute()
    )

    if existing.data:
        db.table("concept_graph_cache").update(
            {"nodes_json": nodes_json, "edges_json": edges_json, "updated_at": now}
        ).eq("folder_id", folder_id).execute()
    else:
        import uuid
        db.table("concept_graph_cache").insert({
            "id": str(uuid.uuid4()),
            "folder_id": folder_id,
            "nodes_json": nodes_json,
            "edges_json": edges_json,
            "updated_at": now,
        }).execute()

    return {
        "nodes": graph["nodes"],
        "edges": graph["edges"],
        "cached": False,
        "updated_at": now,
    }
