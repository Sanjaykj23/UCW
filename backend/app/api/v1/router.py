from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.connections import router as connections_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.messages import router as messages_router
from app.api.v1.posts import router as posts_router
from app.api.v1.upload import router as upload_router

api_v1_router = APIRouter()

# Include Sub-Routers
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(connections_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(messages_router)
api_v1_router.include_router(posts_router)
api_v1_router.include_router(upload_router)
