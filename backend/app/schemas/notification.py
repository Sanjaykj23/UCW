from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

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
