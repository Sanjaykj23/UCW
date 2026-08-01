import uuid
import json
import datetime
import asyncio
import base64
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.database import get_db
from app.models.user import User
from app.models.message import Message
from app.services.storage_service import storage_service
from app.services.websocket_manager import manager
from app.api.deps import get_current_user, get_current_user_ws

router = APIRouter(tags=["Messages & WebSockets"])

def get_channel_id(user_a: str, user_b: str) -> str:
    """Generates a deterministic channel ID for a pair of users."""
    u1, u2 = sorted([str(user_a), str(user_b)])
    return f"chat_{u1}_{u2}"

def decode_text(val: str) -> str:
    """Decodes base64 ciphertext strings returned from RocksDB into readable text."""
    if not val:
        return ""
    if isinstance(val, str):
        try:
            if len(val) % 4 == 0 and not any(c in val for c in " \t\r\n"):
                decoded_bytes = base64.b64decode(val)
                decoded_str = decoded_bytes.decode('utf-8', errors='ignore')
                if decoded_str and any(c.isalnum() for c in decoded_str):
                    return decoded_str
        except Exception:
            pass
        return val
    return str(val)

def normalize_timestamp(ts) -> str:
    """Normalizes nanosecond/millisecond timestamps into valid ISO 8601 UTC strings."""
    if not ts:
        return datetime.datetime.now(datetime.timezone.utc).isoformat()
    if isinstance(ts, (int, float)):
        if ts > 1e14:
            ts_sec = ts / 1e9
        elif ts > 1e11:
            ts_sec = ts / 1e3
        else:
            ts_sec = ts
        try:
            dt = datetime.datetime.fromtimestamp(ts_sec, tz=datetime.timezone.utc)
            return dt.isoformat()
        except Exception:
            return datetime.datetime.now(datetime.timezone.utc).isoformat()

    val = str(ts)
    if not val.endswith("Z") and "+" not in val and "-" not in val[10:]:
        val += "Z"
    return val

@router.get("/chat/history/{other_user_id}")
@router.get("/messages/history/{other_user_id}")
def get_user_chat_history(
    other_user_id: str,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches chat history between current_user and other_user.
    1. First attempts retrieval from Go RocksDB Storage Microservice.
    2. Fallbacks to PostgreSQL messages table if RocksDB is empty or offline.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    chat_id = get_channel_id(current_user.user_id, other_user_id)

    # 1. Try Go RocksDB Microservice first
    rocks_messages, _ = storage_service.get_messages(chat_id, limit=limit)
    if rocks_messages and len(rocks_messages) > 0:
        formatted = []
        for m in rocks_messages:
            raw_content = m.get("ciphertext") or m.get("content", "")
            raw_ts = m.get("timestamp") or m.get("created_at")
            formatted.append({
                "message_id": m.get("message_id") or m.get("id"),
                "chat_id": chat_id,
                "sender_id": m.get("sender_id"),
                "receiver_id": other_user_id if str(m.get("sender_id")) == str(current_user.user_id) else str(current_user.user_id),
                "content": decode_text(raw_content),
                "created_at": normalize_timestamp(raw_ts)
            })
        formatted.reverse()
        return formatted

    # 2. Fallback to PostgreSQL
    try:
        other_uuid = UUID(other_user_id)
        pg_messages = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user.user_id, Message.receiver_id == other_uuid),
                and_(Message.sender_id == other_uuid, Message.receiver_id == current_user.user_id)
            )
        ).order_by(Message.created_at.asc()).limit(limit).all()

        return [{
            "message_id": str(m.message_id),
            "chat_id": chat_id,
            "sender_id": str(m.sender_id),
            "receiver_id": str(m.receiver_id),
            "content": decode_text(m.content),
            "created_at": m.created_at.isoformat() if m.created_at else datetime.datetime.utcnow().isoformat()
        } for m in pg_messages]
    except Exception:
        return []

@router.post("/messages")
@router.post("/messages/send")
def send_http_message(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """HTTP REST fallback endpoint for sending messages when WebSocket is connecting."""
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    receiver_id = payload.get("receiver_id")
    content = payload.get("content") or payload.get("text", "")
    message_id = payload.get("message_id") or str(uuid.uuid4())

    if not receiver_id or not content:
        raise HTTPException(status_code=400, detail="INVALID_PAYLOAD")

    chat_id = get_channel_id(current_user.user_id, receiver_id)

    # 1. Save Encrypted Message to Go RocksDB Microservice
    storage_service.save_message(
        message_id=message_id,
        chat_id=chat_id,
        sender_id=str(current_user.user_id),
        ciphertext=content
    )

    # 2. Save Message Metadata to PostgreSQL Database
    try:
        msg_obj = Message(
            message_id=uuid.UUID(message_id) if isinstance(message_id, str) and len(message_id) == 36 else uuid.uuid4(),
            sender_id=current_user.user_id,
            receiver_id=uuid.UUID(receiver_id),
            content=content,
            is_read=False,
            created_at=datetime.datetime.utcnow()
        )
        db.add(msg_obj)
        db.commit()
    except Exception:
        db.rollback()

    # 3. Route Realtime Message to Receiver if WebSocket Active
    outgoing_frame = {
        "type": "chat_message",
        "message_id": message_id,
        "chat_id": chat_id,
        "sender_id": str(current_user.user_id),
        "receiver_id": str(receiver_id),
        "content": content,
        "created_at": datetime.datetime.utcnow().isoformat()
    }
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(manager.send_personal_message(outgoing_frame, receiver_id))
        else:
            asyncio.run(manager.send_personal_message(outgoing_frame, receiver_id))
    except Exception:
        pass

    return {
        "status": "success",
        "message_id": message_id,
        "chat_id": chat_id,
        "content": content,
        "created_at": datetime.datetime.utcnow().isoformat()
    }

@router.get("/messages/{chat_id}")
def get_chat_messages(
    chat_id: str,
    limit: int = 50,
    cursor: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    messages, next_cursor = storage_service.get_messages(chat_id, limit, cursor)
    return {
        "chat_id": chat_id,
        "messages": messages,
        "next_cursor": next_cursor
    }

@router.delete("/messages/{chat_id}/{timestamp}/{message_id}")
def delete_chat_message(
    chat_id: str,
    timestamp: int,
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    success = storage_service.delete_message(chat_id, timestamp, message_id)
    if not success:
        raise HTTPException(status_code=400, detail="DELETE_FAILED")
    return {"status": "success", "message_id": message_id}

# ====================================================================
# WEBSOCKET CHAT ENDPOINT
# Route: ws://<host>:8000/ws/chat/{client_id}
# ====================================================================
@router.websocket("/ws/chat/{client_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    client_id: str,
    db: Session = Depends(get_db)
):
    await manager.connect(client_id, websocket)
    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                payload = json.loads(data_str)
            except Exception:
                continue

            msg_type = payload.get("type", "chat_message")
            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            if msg_type in ["chat_message", "message"]:
                receiver_id = payload.get("receiver_id")
                content = payload.get("content") or payload.get("text", "")
                chat_id = payload.get("chat_id")
                message_id = payload.get("message_id") or str(uuid.uuid4())

                if not receiver_id or not content:
                    continue

                if not chat_id:
                    chat_id = get_channel_id(client_id, receiver_id)

                # 1. Persist Encrypted Payload to Go RocksDB Microservice
                storage_service.save_message(
                    message_id=message_id,
                    chat_id=chat_id,
                    sender_id=str(client_id),
                    ciphertext=content,
                    nonce=payload.get("nonce", ""),
                    auth_tag=payload.get("auth_tag", "")
                )

                # 2. Persist Message Metadata to PostgreSQL Database
                try:
                    msg_obj = Message(
                        message_id=uuid.UUID(message_id) if isinstance(message_id, str) and len(message_id) == 36 else uuid.uuid4(),
                        sender_id=uuid.UUID(client_id),
                        receiver_id=uuid.UUID(receiver_id),
                        content=content,
                        is_read=False,
                        created_at=datetime.datetime.utcnow()
                    )
                    db.add(msg_obj)
                    db.commit()
                except Exception:
                    db.rollback()

                # 3. Construct Realtime Outgoing Socket Frame
                outgoing_frame = {
                    "type": "chat_message",
                    "message_id": message_id,
                    "chat_id": chat_id,
                    "sender_id": str(client_id),
                    "receiver_id": str(receiver_id),
                    "content": content,
                    "created_at": datetime.datetime.utcnow().isoformat()
                }

                # 4. Route Realtime Frame to Receiver if Connected
                delivered = await manager.send_personal_message(outgoing_frame, receiver_id)

                # 5. Send ACK Confirmation to Sender
                ack_frame = {
                    "type": "message_ack",
                    "message_id": message_id,
                    "status": "DELIVERED" if delivered else "SENT_OFFLINE",
                    "created_at": datetime.datetime.utcnow().isoformat()
                }
                await websocket.send_text(json.dumps(ack_frame))

    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception:
        manager.disconnect(client_id)
