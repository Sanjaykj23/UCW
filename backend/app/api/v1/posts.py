import uuid
import shutil
import datetime
from typing import Optional, List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.post import Post
from app.schemas.post import PostResponse
from app.repositories.user_repository import UserRepository
from app.repositories.post_repository import PostRepository
from app.api.deps import get_current_user

router = APIRouter(prefix="/posts", tags=["Posts & Feed"])

@router.post("", response_model=PostResponse)
async def create_post(
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    if not content and not file:
        raise HTTPException(status_code=400, detail="POST_CANNOT_BE_EMPTY")

    image_url = None
    if file:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="INVALID_FILE_TYPE")
        file_ext = Path(file.filename).suffix or ".jpg"
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = settings.UPLOADS_DIR / unique_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        image_url = f"/uploads/{unique_filename}"

    post_repo = PostRepository(db)
    new_post = Post(
        id=str(uuid.uuid4()),
        user_id=current_user.user_id,
        content=content.strip() if content else "",
        image_url=image_url,
        created_at=datetime.datetime.utcnow()
    )
    saved_post = post_repo.create(new_post)

    return {
        "id": str(saved_post.id),
        "author_id": str(current_user.user_id),
        "author_name": current_user.display_name or current_user.username,
        "author_username": current_user.username,
        "author_photo": current_user.profile_photo,
        "content": saved_post.content,
        "image_url": saved_post.image_url,
        "likes_count": 0,
        "comments_count": 0,
        "is_liked": False,
        "created_at": saved_post.created_at.isoformat()
    }

@router.get("/feed", response_model=List[PostResponse])
def get_feed(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    post_repo = PostRepository(db)
    user_repo = UserRepository(db)
    posts = post_repo.get_feed(limit=50)

    feed_data = []
    for post in posts:
        author = user_repo.get_by_id(post.user_id)
        is_liked = False
        if current_user:
            is_liked = bool(post_repo.get_like(post.id, current_user.user_id))

        feed_data.append({
            "id": str(post.id),
            "author_id": str(author.user_id) if author else None,
            "author_name": author.display_name or author.username if author else "Unknown",
            "author_username": author.username if author else "unknown",
            "author_photo": author.profile_photo if author else None,
            "content": post.content,
            "image_url": post.image_url,
            "likes_count": post.likes_count or 0,
            "comments_count": post.comments_count or 0,
            "is_liked": is_liked,
            "created_at": post.created_at.isoformat() if post.created_at else None
        })

    return feed_data

@router.post("/{post_id}/like")
def toggle_like(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    post_repo = PostRepository(db)
    post = post_repo.get_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="POST_NOT_FOUND")

    is_liked = post_repo.toggle_like(post, current_user.user_id)
    return {"likes_count": post.likes_count or 0, "is_liked": is_liked}
