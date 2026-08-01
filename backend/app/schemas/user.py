from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

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
    connection_status: str = "NOT_CONNECTED"
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
