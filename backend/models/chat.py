from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class ChatCreate(BaseModel):
    folder_id: Optional[str] = None  # None = search across all folders
    title: Optional[str] = "New Chat"


class ChatResponse(BaseModel):
    id: str
    folder_id: Optional[str]
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    chat_id: str
    content: str
    folder_id: Optional[str] = None


class CitationInMessage(BaseModel):
    document_id: str
    document_name: str
    page_number: Optional[int]
    excerpt: str
    relevance_score: float


class MessageResponse(BaseModel):
    id: str
    chat_id: str
    role: str  # "user" | "assistant"
    content: str
    citations: Optional[List[CitationInMessage]] = None
    reasoning_steps: Optional[List[str]] = None
    created_at: datetime


class StreamEvent(BaseModel):
    """Represents a single SSE event during agent reasoning."""
    event_type: str  # "reasoning_step" | "token" | "citations" | "done" | "error"
    data: Any
