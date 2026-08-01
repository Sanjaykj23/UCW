from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PostResponse(BaseModel):
    id: str
    author_id: Optional[str] = None
    author_name: str
    author_username: str
    author_photo: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    is_liked: bool = False
    created_at: Optional[str] = None
