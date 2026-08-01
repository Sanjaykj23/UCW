import json
import logging
from typing import Dict, Any, Optional
from fastapi import WebSocket

logger = logging.getLogger("websocket_manager")

class ConnectionManager:
    """
    ====================================================================
    WEBSOCKET REALTIME CONNECTION MANAGER (OOP / SINGLETON)
    ====================================================================
    ARCHITECTURE & DATA FLOW:
    
    1. Connection Phase:
       - User establishes a WebSocket connection to `ws://<host>:8000/ws/chat/{user_id}`
       - The server validates the token and calls `manager.connect(user_id, websocket)`.
       - Active connection is registered in memory in `active_connections[user_id] = websocket`.
    
    2. Realtime Message Dispatching:
       - When User A sends a message targeted for User B:
         FastAPI -> `manager.send_personal_message(payload, receiver_id)`
       - If User B is online (present in `active_connections`), the JSON payload is delivered immediately over the open socket connection.
       - If User B is offline, the message remains safely persisted in PostgreSQL & Go RocksDB storage microservice for retrieval when User B logs in.

    3. Disconnection Phase:
       - On socket close/disconnect event, `manager.disconnect(user_id)` is invoked to cleanly remove the socket from memory registry.
    ====================================================================
    """

    def __init__(self):
        # Maps user_id (string/UUID) -> Active WebSocket object
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        """Accepts incoming socket handshake and stores connection in memory registry."""
        await websocket.accept()
        self.active_connections[str(user_id)] = websocket
        logger.info(f"WebSocket Connected: User ID {user_id}. Total active: {len(self.active_connections)}")

    def disconnect(self, user_id: str):
        """Removes user connection from memory registry on socket disconnect."""
        key = str(user_id)
        if key in self.active_connections:
            del self.active_connections[key]
            logger.info(f"WebSocket Disconnected: User ID {user_id}. Remaining active: {len(self.active_connections)}")

    async def send_personal_message(self, message: Dict[str, Any], receiver_id: str) -> bool:
        """
        Sends a JSON frame to a specific connected user if they are currently online.
        Returns True if delivered over WebSocket, False if user is offline.
        """
        key = str(receiver_id)
        if key in self.active_connections:
            try:
                ws = self.active_connections[key]
                await ws.send_text(json.dumps(message))
                return True
            except Exception as e:
                logger.error(f"Failed to send message over socket to {receiver_id}: {e}")
                self.disconnect(receiver_id)
                return False
        return False

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts a JSON frame to all currently connected WebSocket clients."""
        disconnected_users = []
        for user_id, ws in self.active_connections.items():
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                disconnected_users.append(user_id)
        
        for u in disconnected_users:
            self.disconnect(u)

# Shared Manager Instance
manager = ConnectionManager()
