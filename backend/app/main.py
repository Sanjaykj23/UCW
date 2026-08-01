import sys
from pathlib import Path
from fastapi import FastAPI, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

# Ensure app package is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.api.v1.router import api_v1_router
from app.api.v1.messages import websocket_chat_endpoint
import app.models  # Ensures all SQLAlchemy models are registered

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Nexus Modular FastAPI Microservice with WebSockets, Post Feeds, and Go Storage Engine Integration",
    version=settings.VERSION
)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static File Serving for Uploads
uploads_dir = settings.UPLOADS_DIR
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Startup Event: DB Initialization
@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] PostgreSQL database connected and tables initialized.")
    except Exception as e:
        print(f"[WARNING] Database initialization note: {e}")

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

# Register Direct Root WebSocket Routes
@app.websocket("/ws/chat/{client_id}")
@app.websocket("/api/ws/chat/{client_id}")
@app.websocket("/api/v1/ws/chat/{client_id}")
async def direct_ws_chat(websocket: WebSocket, client_id: str, db: Session = Depends(get_db)):
    await websocket_chat_endpoint(websocket, client_id, db)

# Register Routers (supports /api/v1/* and legacy /api/* paths)
app.include_router(api_v1_router, prefix="/api/v1")
app.include_router(api_v1_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
