from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FolderCreate(BaseModel):
    name: str
    description: Optional[str] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class FolderResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    document_count: int = 0
    created_at: datetime
    updated_at: datetime
