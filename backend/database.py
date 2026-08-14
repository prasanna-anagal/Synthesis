from fastapi import HTTPException
from supabase import create_client, Client
from config import get_settings

settings = get_settings()

_supabase_client: Client | None = None
_supabase_admin: Client | None = None

DEFAULT_URL = "https://gxffopdhaowjmayigxhe.supabase.co"
DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZmZvcGRoYW93am1heWlneGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDI0OTksImV4cCI6MjEwMjI3ODQ5OX0.LLNl7FbN7_nScYR1GvIlTSXwvL6Pt09SfOk6Jp0iQ_k"


def get_supabase() -> Client:
    """Return the singleton Supabase client (anon key — for user-context operations)."""
    global _supabase_client
    if _supabase_client is None:
        url = settings.supabase_url or DEFAULT_URL
        key = settings.supabase_anon_key or DEFAULT_KEY
        try:
            _supabase_client = create_client(url, key)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize Supabase client: {str(e)}"
            )
    return _supabase_client


def get_supabase_admin() -> Client:
    """Return the service-role Supabase client (bypasses RLS — backend-only)."""
    global _supabase_admin
    if _supabase_admin is None:
        url = settings.supabase_url or DEFAULT_URL
        key = settings.supabase_service_role_key or settings.supabase_anon_key or DEFAULT_KEY
        try:
            _supabase_admin = create_client(url, key)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize Supabase admin client: {str(e)}"
            )
    return _supabase_admin
