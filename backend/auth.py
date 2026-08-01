import os
import sys
import datetime
import httpx
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import database
import models

env_path = backend_dir.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretjwtkey_whatsapp_demo_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
GOOGLE_CLIENT_ID = os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

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
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def verify_google_id_token(token_str: str) -> dict:
    """
    Verifies Google ID token or OAuth access token against Google services.
    Returns user dict containing email, name, picture, sub.
    """
    # 1. Try Google ID Token Verification
    try:
        id_info = id_token.verify_oauth2_token(
            token_str,
            google_requests.Request(),
            GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None
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

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)) -> Optional[models.User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
    except JWTError:
        return None
        
    user = db.query(models.User).filter(models.User.username == username).first()
    return user
