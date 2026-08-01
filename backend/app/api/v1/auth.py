import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, verify_google_id_token
from app.models.user import User
from app.schemas.auth import GoogleVerifyRequest, GoogleVerifyResponse, UserRegisterRequest, UserLoginRequest, AuthTokenResponse
from app.schemas.user import UserResponse
from app.repositories.user_repository import UserRepository
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_MAX_AGE = 3600  # 60 minutes (1 hour)

def set_auth_cookie(response: Response, token: str):
    """Sets secure HttpOnly cookie for session token with 60-minute expiration."""
    response.set_cookie(
        key="ucw_access_token",
        value=token,
        httponly=True,
        max_age=COOKIE_MAX_AGE,
        expires=COOKIE_MAX_AGE,
        samesite="lax",
        secure=False  # True in HTTPS production
    )

@router.post("/google-verify", response_model=GoogleVerifyResponse)
def google_verify(payload: GoogleVerifyRequest, db: Session = Depends(get_db)):
    if not payload.id_token:
        raise HTTPException(status_code=400, detail="id_token is required")
    
    verified_info = verify_google_id_token(payload.id_token)
    user_repo = UserRepository(db)
    existing_user = user_repo.get_by_email(verified_info["email"])
    verified_info["exists_in_db"] = True if existing_user else False

    return verified_info

@router.post("/register", response_model=AuthTokenResponse)
def register_user(req: UserRegisterRequest, response: Response, db: Session = Depends(get_db)):
    user_repo = UserRepository(db)

    if user_repo.get_by_username(req.username):
        raise HTTPException(status_code=400, detail="USERNAME_ALREADY_TAKEN")
        
    if user_repo.get_by_email(req.email):
        raise HTTPException(status_code=400, detail="EMAIL_ALREADY_REGISTERED")

    hashed_pwd = get_password_hash(req.password)
    
    new_user = User(
        user_id=uuid.uuid4(),
        username=req.username.strip(),
        display_name=req.display_name.strip() if req.display_name else req.username.strip(),
        email=req.email.strip().lower(),
        phone_number=req.phone.strip() if req.phone else None,
        area=req.area or "SALIGRAMAM_SEC",
        password_hash=hashed_pwd,
        google_id=req.google_token[:50] if req.google_token else None,
        email_verified=True,
        profile_photo=None,
        bio=None,
        skills="Next.js, Python, PostgreSQL, FastAPI",
        interests="Web Development, Cyber Security"
    )
    
    saved_user = user_repo.create(new_user)
    access_token = create_access_token(data={"sub": saved_user.username, "email": saved_user.email})
    
    # Set HttpOnly Cookie (60-minute expiration)
    set_auth_cookie(response, access_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": saved_user
    }

@router.post("/login", response_model=AuthTokenResponse)
def login_user(req: UserLoginRequest, response: Response, db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    user = user_repo.get_by_identifier(req.identifier)
    
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")
        
    access_token = create_access_token(data={"sub": user.username, "email": user.email})

    # Set HttpOnly Cookie (60-minute expiration)
    set_auth_cookie(response, access_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/google-login", response_model=AuthTokenResponse)
def google_login(payload: GoogleVerifyRequest, response: Response, db: Session = Depends(get_db)):
    if not payload.id_token:
        raise HTTPException(status_code=400, detail="id_token is required")
    
    google_info = verify_google_id_token(payload.id_token)
    user_repo = UserRepository(db)
    user = user_repo.get_by_email(google_info["email"])
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EMAIL_NOT_REGISTERED")

    access_token = create_access_token(data={"sub": user.username, "email": user.email})

    # Set HttpOnly Cookie (60-minute expiration)
    set_auth_cookie(response, access_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/logout")
def logout_user(response: Response):
    """Clears the HttpOnly authentication cookie."""
    response.delete_cookie(key="ucw_access_token", samesite="lax")
    return {"status": "success", "message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")
    return current_user
