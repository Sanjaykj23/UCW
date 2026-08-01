import uuid
import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=True)
    email = Column(String(100), unique=True, index=True, nullable=True)
    phone_number = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=True)
    profile_photo = Column(String(255), nullable=True)
    banner_photo = Column(Text, nullable=True)
    area = Column(String(100), nullable=True)
    google_id = Column(String(255), nullable=True)
    email_verified = Column(Boolean, default=True, nullable=True)
    bio = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)
    interests = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
