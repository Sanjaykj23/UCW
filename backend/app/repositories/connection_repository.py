from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from uuid import UUID

from app.models.connection import Connection

class ConnectionRepository:
    """Repository handling database queries for Connection entities."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, connection_id: UUID) -> Optional[Connection]:
        return self.db.query(Connection).filter(Connection.connection_id == connection_id).first()

    def get_existing_connection(self, user_a: UUID, user_b: UUID) -> Optional[Connection]:
        return self.db.query(Connection).filter(
            or_(
                and_(Connection.sender_id == user_a, Connection.receiver_id == user_b),
                and_(Connection.sender_id == user_b, Connection.receiver_id == user_a)
            )
        ).first()

    def create(self, connection: Connection) -> Connection:
        self.db.add(connection)
        self.db.commit()
        self.db.refresh(connection)
        return connection

    def update(self, connection: Connection) -> Connection:
        self.db.commit()
        self.db.refresh(connection)
        return connection

    def get_accepted_connections(self, user_id: UUID) -> List[Connection]:
        return self.db.query(Connection).filter(
            and_(
                or_(Connection.sender_id == user_id, Connection.receiver_id == user_id),
                Connection.status == "ACCEPTED"
            )
        ).all()

    def get_pending_connections(self, user_id: UUID) -> List[Connection]:
        return self.db.query(Connection).filter(
            and_(
                Connection.receiver_id == user_id,
                Connection.status == "PENDING"
            )
        ).all()
