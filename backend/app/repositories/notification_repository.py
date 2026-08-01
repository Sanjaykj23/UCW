from typing import Optional, List
from sqlalchemy.orm import Session
from uuid import UUID

from app.models.notification import Notification

class NotificationRepository:
    """Repository handling database queries for Notification entities."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, notification_id: UUID) -> Optional[Notification]:
        return self.db.query(Notification).filter(Notification.notification_id == notification_id).first()

    def create(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def get_for_user(self, user_id: UUID, limit: int = 50) -> List[Notification]:
        return self.db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc()).limit(limit).all()

    def mark_as_read(self, notification: Notification) -> Notification:
        notification.is_read = True
        self.db.commit()
        self.db.refresh(notification)
        return notification
