import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings:
    PROJECT_NAME: str = "Nexus API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"

    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretjwtkey_whatsapp_demo_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 60 minutes (1 hour)

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "")

    # Storage Microservice (Go RocksDB)
    GO_STORAGE_URL: str = os.getenv("GO_STORAGE_URL", "http://localhost:8081")

    # Static Uploads
    UPLOADS_DIR: Path = BASE_DIR / "uploads"

settings = Settings()
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
