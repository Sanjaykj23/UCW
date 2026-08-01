from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from uuid import UUID

from app.models.user import User

class UserRepository:
    """Repository handling all database queries and updates for User entities."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: UUID) -> Optional[User]:
        return self.db.query(User).filter(User.user_id == user_id).first()

    def get_by_username(self, username: str) -> Optional[User]:
        return self.db.query(User).filter(User.username.ilike(username.strip())).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email.ilike(email.strip())).first()

    def get_by_identifier(self, identifier: str) -> Optional[User]:
        ident = identifier.strip().lower()
        return self.db.query(User).filter(
            or_(User.username.ilike(ident), User.email.ilike(ident))
        ).first()

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user

    def search(self, query_str: str, exclude_user_id: Optional[UUID] = None, limit: int = 20) -> List[User]:
        pattern = f"%{query_str.strip()}%"
        q = self.db.query(User).filter(
            or_(User.username.ilike(pattern), User.display_name.ilike(pattern))
        )
        if exclude_user_id:
            q = q.filter(User.user_id != exclude_user_id)
        return q.limit(limit).all()

    def get_suggestions(self, exclude_user_id: Optional[UUID] = None, area: Optional[str] = None, limit: int = 20) -> List[User]:
        q = self.db.query(User)
        if exclude_user_id:
            q = q.filter(User.user_id != exclude_user_id)
        if area and area.strip():
            q = q.filter(User.area.ilike(area.strip()))
        return q.limit(limit).all()

    def get_by_area(self, area: str, exclude_user_id: Optional[UUID] = None, limit: int = 50) -> List[User]:
        q = self.db.query(User).filter(User.area.ilike(area.strip()))
        if exclude_user_id:
            q = q.filter(User.user_id != exclude_user_id)
        return q.limit(limit).all()
