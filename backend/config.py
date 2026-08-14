from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Supabase defaults
    supabase_url: str = "https://gxffopdhaowjmayigxhe.supabase.co"
    supabase_anon_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmZvcGRoYW93am1heWlneGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDI0OTksImV4cCI6MjEwMjI3ODQ5OX0.LLNl7FbN7_nScYR1GvIlTSXwvL6Pt09SfOk6Jp0iQ_k"
    supabase_service_role_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmZvcGRoYW93am1heWlneGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDI0OTksImV4cCI6MjEwMjI3ODQ5OX0.LLNl7FbN7_nScYR1GvIlTSXwvL6Pt09SfOk6Jp0iQ_k"

    # Database
    database_url: str = ""

    # App
    secret_key: str = "change-this-secret"
    upload_dir: str = "uploads"
    chroma_persist_dir: str = "chroma_db"
    frontend_url: str = "http://localhost:5173"

    # Chunking
    chunk_size: int = 800
    chunk_overlap: int = 150

    # Agent
    max_retrieval_rounds: int = 3
    top_k_chunks: int = 6

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
