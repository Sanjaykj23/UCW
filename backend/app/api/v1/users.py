from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.connection import Connection
from app.schemas.user import UserSearchResult, UserProfileResponse, UserResponse, UserProfileUpdate
from app.repositories.user_repository import UserRepository
from app.repositories.connection_repository import ConnectionRepository
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/search", response_model=List[UserSearchResult])
def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    user_repo = UserRepository(db)
    exclude_id = current_user.user_id if current_user else None
    return user_repo.search(query_str=q, exclude_user_id=exclude_id)

@router.get("/suggestions", response_model=List[UserSearchResult])
def get_user_suggestions(
    area: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    user_repo = UserRepository(db)
    exclude_id = current_user.user_id if current_user else None
    return user_repo.get_suggestions(exclude_user_id=exclude_id, area=area)

@router.get("/by-area", response_model=List[UserSearchResult])
def get_users_by_area(
    area: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    target_area = area.strip() if area else (current_user.area if current_user and current_user.area else None)
    if not target_area:
        return []

    user_repo = UserRepository(db)
    exclude_id = current_user.user_id if current_user else None
    return user_repo.get_by_area(area=target_area, exclude_user_id=exclude_id)

@router.put("/profile", response_model=UserResponse)
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")

    user_repo = UserRepository(db)
    if payload.display_name is not None:
        current_user.display_name = payload.display_name.strip()
    if payload.bio is not None:
        current_user.bio = payload.bio.strip()
    if payload.area is not None:
        current_user.area = payload.area.strip()
    if payload.phone_number is not None:
        current_user.phone_number = payload.phone_number.strip()
    if payload.skills is not None:
        current_user.skills = payload.skills.strip()
    if payload.interests is not None:
        current_user.interests = payload.interests.strip()
    if payload.profile_photo is not None:
        current_user.profile_photo = payload.profile_photo
    if payload.banner_photo is not None:
        current_user.banner_photo = payload.banner_photo

    return user_repo.update(current_user)

@router.get("/{username}", response_model=UserProfileResponse)
def get_user_profile(
    username: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    user_repo = UserRepository(db)
    target_user = user_repo.get_by_username(username)
    if not target_user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    connection_status = "NOT_CONNECTED"
    connection_id = None

    if current_user:
        if current_user.user_id == target_user.user_id:
            connection_status = "SELF"
        else:
            conn_repo = ConnectionRepository(db)
            conn = conn_repo.get_existing_connection(current_user.user_id, target_user.user_id)
            if conn:
                connection_id = conn.connection_id
                if conn.status == "ACCEPTED":
                    connection_status = "ACCEPTED"
                elif conn.status == "PENDING":
                    connection_status = "PENDING_SENT" if conn.sender_id == current_user.user_id else "PENDING_RECEIVED"
                elif conn.status == "REJECTED":
                    connection_status = "REJECTED"

    return {
        "user_id": target_user.user_id,
        "username": target_user.username,
        "display_name": target_user.display_name,
        "profile_photo": target_user.profile_photo,
        "banner_photo": getattr(target_user, "banner_photo", None),
        "area": target_user.area,
        "bio": target_user.bio,
        "skills": target_user.skills,
        "interests": target_user.interests,
        "connection_status": connection_status,
        "connection_id": connection_id,
        "created_at": target_user.created_at
    }
