import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.connection import Connection
from app.models.notification import Notification
from app.schemas.connection import ConnectionRequestPayload, ConnectionActionPayload, ConnectionResponse
from app.repositories.user_repository import UserRepository
from app.repositories.connection_repository import ConnectionRepository
from app.repositories.notification_repository import NotificationRepository
from app.api.deps import get_current_user

router = APIRouter(prefix="/connections", tags=["Connections"])

@router.post("/request", response_model=ConnectionResponse)
def send_connection_request(
    payload: ConnectionRequestPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    if payload.receiver_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="CANNOT_CONNECT_WITH_SELF")

    user_repo = UserRepository(db)
    target_user = user_repo.get_by_id(payload.receiver_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="RECEIVER_NOT_FOUND")

    conn_repo = ConnectionRepository(db)
    existing_conn = conn_repo.get_existing_connection(current_user.user_id, payload.receiver_id)

    if existing_conn:
        if existing_conn.status == "ACCEPTED":
            raise HTTPException(status_code=400, detail="ALREADY_CONNECTED")
        if existing_conn.status == "PENDING":
            raise HTTPException(status_code=400, detail="CONNECTION_REQUEST_PENDING")
        existing_conn.status = "PENDING"
        existing_conn.sender_id = current_user.user_id
        existing_conn.receiver_id = payload.receiver_id
        saved_conn = conn_repo.update(existing_conn)
    else:
        new_conn = Connection(
            connection_id=uuid.uuid4(),
            sender_id=current_user.user_id,
            receiver_id=payload.receiver_id,
            status="PENDING"
        )
        saved_conn = conn_repo.create(new_conn)

    # Create Notification
    notif_repo = NotificationRepository(db)
    notif = Notification(
        notification_id=uuid.uuid4(),
        user_id=target_user.user_id,
        sender_id=current_user.user_id,
        type="CONNECTION_REQUEST",
        message=f"{current_user.display_name or current_user.username} sent you a connection request.",
        is_read=False
    )
    notif_repo.create(notif)

    return {
        "connection_id": saved_conn.connection_id,
        "sender_id": saved_conn.sender_id,
        "receiver_id": saved_conn.receiver_id,
        "status": saved_conn.status,
        "created_at": saved_conn.created_at,
        "other_user_id": target_user.user_id,
        "other_username": target_user.username,
        "other_display_name": target_user.display_name,
        "other_profile_photo": target_user.profile_photo
    }

@router.post("/action", response_model=ConnectionResponse)
def handle_connection_action(
    payload: ConnectionActionPayload,
    action: str,  # accept, reject, cancel
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    conn_repo = ConnectionRepository(db)
    conn = conn_repo.get_by_id(payload.connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="CONNECTION_NOT_FOUND")

    user_repo = UserRepository(db)
    notif_repo = NotificationRepository(db)
    action_lower = action.lower().strip()

    if action_lower == "accept":
        if conn.receiver_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="NOT_AUTHORIZED_TO_ACCEPT")
        conn.status = "ACCEPTED"
        saved_conn = conn_repo.update(conn)

        notif = Notification(
            notification_id=uuid.uuid4(),
            user_id=conn.sender_id,
            sender_id=current_user.user_id,
            type="CONNECTION_ACCEPTED",
            message=f"{current_user.display_name or current_user.username} accepted your connection request.",
            is_read=False
        )
        notif_repo.create(notif)

    elif action_lower == "reject":
        if conn.receiver_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="NOT_AUTHORIZED_TO_REJECT")
        conn.status = "REJECTED"
        saved_conn = conn_repo.update(conn)

    elif action_lower == "cancel":
        if conn.sender_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="NOT_AUTHORIZED_TO_CANCEL")
        db.delete(conn)
        db.commit()
        raise HTTPException(status_code=200, detail="CONNECTION_CANCELLED")
    else:
        raise HTTPException(status_code=400, detail="INVALID_ACTION")

    other_user_id = conn.receiver_id if conn.sender_id == current_user.user_id else conn.sender_id
    other_user = user_repo.get_by_id(other_user_id)

    return {
        "connection_id": saved_conn.connection_id,
        "sender_id": saved_conn.sender_id,
        "receiver_id": saved_conn.receiver_id,
        "status": saved_conn.status,
        "created_at": saved_conn.created_at,
        "other_user_id": other_user.user_id,
        "other_username": other_user.username,
        "other_display_name": other_user.display_name,
        "other_profile_photo": other_user.profile_photo
    }

@router.get("/list", response_model=List[ConnectionResponse])
def get_accepted_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    conn_repo = ConnectionRepository(db)
    user_repo = UserRepository(db)
    connections = conn_repo.get_accepted_connections(current_user.user_id)

    results = []
    for conn in connections:
        other_user_id = conn.receiver_id if conn.sender_id == current_user.user_id else conn.sender_id
        other_user = user_repo.get_by_id(other_user_id)
        if other_user:
            results.append({
                "connection_id": conn.connection_id,
                "sender_id": conn.sender_id,
                "receiver_id": conn.receiver_id,
                "status": conn.status,
                "created_at": conn.created_at,
                "other_user_id": other_user.user_id,
                "other_username": other_user.username,
                "other_display_name": other_user.display_name,
                "other_profile_photo": other_user.profile_photo
            })
    return results

@router.get("/pending", response_model=List[ConnectionResponse])
def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    conn_repo = ConnectionRepository(db)
    user_repo = UserRepository(db)
    pending_conns = conn_repo.get_pending_connections(current_user.user_id)

    results = []
    for conn in pending_conns:
        sender = user_repo.get_by_id(conn.sender_id)
        if sender:
            results.append({
                "connection_id": conn.connection_id,
                "sender_id": conn.sender_id,
                "receiver_id": conn.receiver_id,
                "status": conn.status,
                "created_at": conn.created_at,
                "other_user_id": sender.user_id,
                "other_username": sender.username,
                "other_display_name": sender.display_name,
                "other_profile_photo": sender.profile_photo
            })
    return results
