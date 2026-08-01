from pydantic import BaseModel, EmailStr
from typing import Optional
from app.schemas.user import UserResponse

class GoogleVerifyRequest(BaseModel):
    id_token: str

class GoogleVerifyResponse(BaseModel):
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    sub: Optional[str] = None
    email_verified: bool = True
    exists_in_db: bool = False

class UserRegisterRequest(BaseModel):
    username: str
    display_name: Optional[str] = None
    phone: Optional[str] = None
    area: Optional[str] = "SALIGRAMAM_SEC"
    email: EmailStr
    password: str
    google_token: Optional[str] = None

class UserLoginRequest(BaseModel):
    identifier: str
    password: str

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
