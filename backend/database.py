from supabase import create_client, Client
from config import get_settings

settings = get_settings()

_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Return the singleton Supabase client (anon key — for user-context operations)."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_anon_key,
        )
    return _supabase_client


_supabase_admin: Client | None = None


def get_supabase_admin() -> Client:
    """Return the service-role Supabase client (bypasses RLS — backend-only)."""
    global _supabase_admin
    if _supabase_admin is None:
        _supabase_admin = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _supabase_admin
