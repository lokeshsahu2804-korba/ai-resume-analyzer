"""
Internal Microservice Authentication Middleware (app/middleware/auth.py)
Validates X-Internal-API-Key header on protected internal endpoints.
"""

from typing import Optional
from fastapi import Header, HTTPException, status
from app.config import INTERNAL_API_KEY


async def verify_internal_api_key(
    x_internal_api_key: Optional[str] = Header(None, alias="X-Internal-API-Key")
) -> str:
    """
    FastAPI security dependency ensuring only the Express backend can invoke internal AI routes.
    """
    if not INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="INTERNAL_API_KEY is not configured on the AI service"
        )

    if not x_internal_api_key or x_internal_api_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing X-Internal-API-Key header"
        )

    return x_internal_api_key
