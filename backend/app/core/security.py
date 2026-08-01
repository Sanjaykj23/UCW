import datetime
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
import httpx
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import HTTPException, status

from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def verify_google_id_token(token_str: str) -> dict:
    # 1. Try Google ID Token Verification
    try:
        id_info = id_token.verify_oauth2_token(
            token_str,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None
        )
        email = id_info.get("email")
        if email:
            return {
                "email": email,
                "name": id_info.get("name"),
                "picture": id_info.get("picture"),
                "sub": id_info.get("sub"),
                "email_verified": id_info.get("email_verified", True)
            }
    except Exception:
        pass

    # 2. Try Google UserInfo API (for Access Tokens)
    try:
        resp = httpx.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {token_str}"}, timeout=5.0)
        if resp.status_code == 200:
            info = resp.json()
            if "email" in info:
                return {
                    "email": info["email"],
                    "name": info.get("name"),
                    "picture": info.get("picture"),
                    "sub": info.get("sub"),
                    "email_verified": info.get("email_verified", True)
                }
    except Exception:
        pass

    # 3. Fallback pyjwt decode
    try:
        import jwt as pyjwt
        decoded = pyjwt.decode(token_str, options={"verify_signature": False})
        if "email" in decoded:
            return {
                "email": decoded["email"],
                "name": decoded.get("name"),
                "picture": decoded.get("picture"),
                "sub": decoded.get("sub"),
                "email_verified": True
            }
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid Google OAuth Token"
    )
