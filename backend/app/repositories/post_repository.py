from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID

from app.models.post import Post, PostLike

class PostRepository:
    """Repository handling database queries for Post entities."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, post_id: str) -> Optional[Post]:
        return self.db.query(Post).filter(Post.id == post_id).first()

    def create(self, post: Post) -> Post:
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return post

    def get_feed(self, limit: int = 50) -> List[Post]:
        return self.db.query(Post).order_by(Post.created_at.desc()).limit(limit).all()

    def get_like(self, post_id: str, user_id: UUID) -> Optional[PostLike]:
        return self.db.query(PostLike).filter(
            and_(PostLike.post_id == post_id, PostLike.user_id == user_id)
        ).first()

    def toggle_like(self, post: Post, user_id: UUID) -> bool:
        like_entry = self.get_like(post.id, user_id)
        if like_entry:
            self.db.delete(like_entry)
            post.likes_count = max(0, (post.likes_count or 1) - 1)
            is_liked = False
        else:
            new_like = PostLike(post_id=post.id, user_id=user_id)
            self.db.add(new_like)
            post.likes_count = (post.likes_count or 0) + 1
            is_liked = True
        self.db.commit()
        return is_liked
