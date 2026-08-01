from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

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
    identifier: str  # username or email
    password: str

class UserResponse(BaseModel):
    user_id: UUID
    username: str
    display_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    area: Optional[str] = None
    profile_photo: Optional[str] = None
    banner_photo: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    interests: Optional[str] = None
    email_verified: Optional[bool] = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ----------------------------------------------------
# Search & Public Profile Schemas
# ----------------------------------------------------
class UserSearchResult(BaseModel):
    user_id: UUID
    username: str
    display_name: Optional[str] = None
    profile_photo: Optional[str] = None
    area: Optional[str] = None
    bio: Optional[str] = None

    class Config:
        from_attributes = True

class UserProfileResponse(BaseModel):
    user_id: UUID
    username: str
    display_name: Optional[str] = None
    profile_photo: Optional[str] = None
    banner_photo: Optional[str] = None
    area: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    interests: Optional[str] = None
    connection_status: str = "NOT_CONNECTED" # NOT_CONNECTED, PENDING_SENT, PENDING_RECEIVED, ACCEPTED, REJECTED, SELF
    connection_id: Optional[UUID] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    area: Optional[str] = None
    phone_number: Optional[str] = None
    skills: Optional[str] = None
    interests: Optional[str] = None
    profile_photo: Optional[str] = None
    banner_photo: Optional[str] = None

# ----------------------------------------------------
# Connection & Notification Schemas
# ----------------------------------------------------
class ConnectionRequestPayload(BaseModel):
    receiver_id: UUID

class ConnectionActionPayload(BaseModel):
    connection_id: UUID

class ConnectionResponse(BaseModel):
    connection_id: UUID
    sender_id: UUID
    receiver_id: UUID
    status: str
    created_at: datetime
    other_user_id: UUID
    other_username: str
    other_display_name: Optional[str] = None
    other_profile_photo: Optional[str] = None

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    notification_id: UUID
    user_id: UUID
    sender_id: UUID
    sender_username: str
    sender_display_name: Optional[str] = None
    sender_profile_photo: Optional[str] = None
    type: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
