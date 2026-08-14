from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    INDEXED = "indexed"
    ERROR = "error"


class DocumentResponse(BaseModel):
    id: str
    folder_id: str
    user_id: str
    filename: str
    file_path: str
    file_type: str
    file_size: int
    page_count: Optional[int] = None
    status: DocumentStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content: str
    page_number: Optional[int] = None


class CitationResponse(BaseModel):
    document_id: str
    document_name: str
    page_number: Optional[int]
    chunk_content: str
    relevance_score: float
