from typing import Optional
from fastapi import Depends, Request, Query, WebSocket
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.repositories.user_repository import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Extracts authenticated user from HttpOnly Cookie ('ucw_access_token') 
    or Authorization: Bearer header.
    """
    # 1. Check HttpOnly Cookie first
    auth_token = request.cookies.get("ucw_access_token")
    if not auth_token:
        # 2. Fallback to Authorization Header
        auth_token = token

    if not auth_token:
        return None

    payload = decode_access_token(auth_token)
    if not payload or "sub" not in payload:
        return None

    user_repo = UserRepository(db)
    user = user_repo.get_by_username(payload["sub"])
    return user

async def get_current_user_ws(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    # Extract from cookie or query param
    auth_token = websocket.cookies.get("ucw_access_token") or token
    if not auth_token:
        return None

    payload = decode_access_token(auth_token)
    if not payload or "sub" not in payload:
        return None

    user_repo = UserRepository(db)
    user = user_repo.get_by_username(payload["sub"])
    return user
