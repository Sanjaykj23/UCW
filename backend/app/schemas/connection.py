from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

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
