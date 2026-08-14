"""
Embedding service — sentence-transformers + ChromaDB.
Handles embedding generation and vector storage/retrieval.
Uses a local model (no API cost).
"""
import uuid
from typing import List, Optional, Dict, Any
import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from config import get_settings
from services.parser import ParsedChunk

settings = get_settings()

# ── Singleton model and ChromaDB client ─────────────────────────────────────

_embedding_model: Optional[SentenceTransformer] = None
_chroma_client: Optional[chromadb.PersistentClient] = None


def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        # all-MiniLM-L6-v2: fast, small (80MB), good quality for semantic search
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


def get_chroma_client() -> chromadb.PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
        )
    return _chroma_client


def get_or_create_collection(folder_id: str) -> chromadb.Collection:
    """Each folder gets its own ChromaDB collection for isolated search."""
    client = get_chroma_client()
    collection_name = f"folder_{folder_id.replace('-', '_')}"
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )


# ── Indexing ─────────────────────────────────────────────────────────────────

def index_document_chunks(
    folder_id: str,
    document_id: str,
    document_name: str,
    chunks: List[ParsedChunk],
) -> List[str]:
    """
    Embed and store a document's chunks into ChromaDB.
    Returns a list of ChromaDB IDs (one per chunk) for storing in Postgres.
    """
    if not chunks:
        return []

    model = get_embedding_model()
    collection = get_or_create_collection(folder_id)

    texts = [c.content for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=False, batch_size=32).tolist()

    chroma_ids = [str(uuid.uuid4()) for _ in chunks]
    metadatas = [
        {
            "document_id": document_id,
            "document_name": document_name,
            "chunk_index": c.chunk_index,
            "page_number": c.page_number if c.page_number is not None else -1,
            "char_start": c.char_start,
            "char_end": c.char_end,
        }
        for c in chunks
    ]

    collection.add(
        ids=chroma_ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )

    return chroma_ids


def delete_document_from_collection(folder_id: str, document_id: str):
    """Remove all chunks for a document from ChromaDB."""
    collection = get_or_create_collection(folder_id)
    results = collection.get(where={"document_id": document_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])


# ── Retrieval ─────────────────────────────────────────────────────────────────

class RetrievedChunk:
    """A chunk retrieved from ChromaDB with similarity score."""
    def __init__(
        self,
        chroma_id: str,
        content: str,
        document_id: str,
        document_name: str,
        page_number: Optional[int],
        chunk_index: int,
        relevance_score: float,
    ):
        self.chroma_id = chroma_id
        self.content = content
        self.document_id = document_id
        self.document_name = document_name
        self.page_number = page_number if page_number != -1 else None
        self.chunk_index = chunk_index
        self.relevance_score = relevance_score


def search_folder(
    folder_id: str,
    query: str,
    top_k: int = 6,
    document_id: Optional[str] = None,
) -> List[RetrievedChunk]:
    """
    Semantic search within a folder's ChromaDB collection.
    Optionally filter to a single document (for targeted retrieval).
    Returns chunks sorted by relevance (descending).
    """
    model = get_embedding_model()
    collection = get_or_create_collection(folder_id)

    query_embedding = model.encode([query], show_progress_bar=False)[0].tolist()

    where_filter = {"document_id": document_id} if document_id else None

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count() or 1),
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    retrieved = []
    if not results["ids"] or not results["ids"][0]:
        return retrieved

    for i, chroma_id in enumerate(results["ids"][0]):
        meta = results["metadatas"][0][i]
        distance = results["distances"][0][i]
        # Cosine distance → similarity score (0–1, higher is better)
        score = max(0.0, 1.0 - distance)

        retrieved.append(
            RetrievedChunk(
                chroma_id=chroma_id,
                content=results["documents"][0][i],
                document_id=meta["document_id"],
                document_name=meta["document_name"],
                page_number=meta.get("page_number"),
                chunk_index=meta.get("chunk_index", 0),
                relevance_score=score,
            )
        )

    return sorted(retrieved, key=lambda x: x.relevance_score, reverse=True)


def get_collection_stats(folder_id: str) -> Dict[str, Any]:
    """Return stats about the folder's ChromaDB collection."""
    collection = get_or_create_collection(folder_id)
    return {"total_chunks": collection.count()}
