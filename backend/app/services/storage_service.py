import requests
import base64
from typing import Tuple, List, Dict, Any
from app.core.config import settings

class StorageService:
    """
    HTTP Client communicating with the Go RocksDB Storage Microservice Daemon (Port 8081).
    Encapsulates message persistence, listing, and deletion into RocksDB.
    """

    def __init__(self, base_url: str = None):
        self.base_url = base_url or settings.GO_STORAGE_URL

    def save_message(
        self,
        message_id: str,
        chat_id: str,
        sender_id: str,
        ciphertext: str,
        nonce: str = "",
        auth_tag: str = ""
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/storage/messages"

        payload = {
            "message_id": message_id,
            "chat_id": chat_id,
            "sender_id": sender_id,
            "ciphertext": base64.b64encode(ciphertext.encode()).decode() if isinstance(ciphertext, str) else ciphertext,
            "nonce": base64.b64encode(nonce.encode()).decode() if nonce else "",
            "authentication_tag": base64.b64encode(auth_tag.encode()).decode() if auth_tag else ""
        }

        try:
            resp = requests.post(url, json=payload, timeout=5)
            if resp.status_code == 201:
                return resp.json()
            return payload
        except Exception:
            return payload

    def get_messages(self, chat_id: str, limit: int = 50, cursor: str = "") -> Tuple[List[dict], str]:
        url = f"{self.base_url}/storage/messages/{chat_id}?limit={limit}&cursor={cursor}"
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("messages", []), data.get("next_cursor", "")
            return [], ""
        except Exception:
            return [], ""

    def delete_message(self, chat_id: str, timestamp: int, message_id: str) -> bool:
        url = f"{self.base_url}/storage/messages/{chat_id}/{timestamp}/{message_id}"
        try:
            resp = requests.delete(url, timeout=5)
            return resp.status_code == 200
        except Exception:
            return False

storage_service = StorageService()
