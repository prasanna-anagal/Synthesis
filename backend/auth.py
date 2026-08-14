from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from database import get_supabase_admin
import httpx
from config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Client = Depends(get_supabase_admin),
) -> dict:
    """
    Validate the Supabase JWT token passed in the Authorization header.
    Returns the decoded user payload on success.
    """
    token = credentials.credentials
    try:
        # Ask Supabase to verify the token and return user info
        response = db.auth.get_user(token)
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return {
            "id": response.user.id,
            "email": response.user.email,
            "token": token,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(exc)}",
        )
