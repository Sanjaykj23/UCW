from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from app.repositories.user_repository import UserRepository
from app.repositories.notification_repository import NotificationRepository
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    notif_repo = NotificationRepository(db)
    user_repo = UserRepository(db)
    notifications = notif_repo.get_for_user(current_user.user_id)

    results = []
    for notif in notifications:
        sender = user_repo.get_by_id(notif.sender_id)
        results.append({
            "notification_id": notif.notification_id,
            "user_id": notif.user_id,
            "sender_id": notif.sender_id,
            "sender_username": sender.username if sender else "Unknown",
            "sender_display_name": sender.display_name if sender else None,
            "sender_profile_photo": sender.profile_photo if sender else None,
            "type": notif.type,
            "message": notif.message,
            "is_read": notif.is_read,
            "created_at": notif.created_at
        })
    return results

@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    notif_repo = NotificationRepository(db)
    notif = notif_repo.get_by_id(notification_id)
    if not notif or notif.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="NOTIFICATION_NOT_FOUND")

    notif_repo.mark_as_read(notif)
    return {"status": "success", "notification_id": notification_id, "is_read": True}
