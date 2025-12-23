from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import List, Optional
import os
from app.models.connection_models import SavedConnection, Base, ConnectionCreate, ConnectionUpdate
from app.services.database_service import database_service
from app.models import DatabaseType

class ConnectionService:
    def __init__(self, db_url="sqlite:///./saved_connections.db"):
        self.engine = create_engine(db_url, connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def get_db(self):
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def get_all(self) -> List[SavedConnection]:
        db = self.SessionLocal()
        try:
            return db.query(SavedConnection).all()
        finally:
            db.close()

    def get_by_id(self, connection_id: int) -> Optional[SavedConnection]:
        db = self.SessionLocal()
        try:
            return db.query(SavedConnection).filter(SavedConnection.id == connection_id).first()
        finally:
            db.close()

    def create(self, connection_data: ConnectionCreate) -> SavedConnection:
        db = self.SessionLocal()
        try:
            version = "Unknown"
            try:
                version = database_service.get_database_version(DatabaseType.CUSTOM, connection_data.connection_string)
            except Exception:
                pass

            db_connection = SavedConnection(
                name=connection_data.name,
                type=connection_data.type,
                connection_string=connection_data.connection_string,
                version=version
            )
            db.add(db_connection)
            db.commit()
            db.refresh(db_connection)
            return db_connection
        finally:
            db.close()

    def update(self, connection_id: int, connection_data: ConnectionUpdate) -> Optional[SavedConnection]:
        db = self.SessionLocal()
        try:
            db_connection = db.query(SavedConnection).filter(SavedConnection.id == connection_id).first()
            if not db_connection:
                return None
            
            if connection_data.name is not None:
                db_connection.name = connection_data.name
            if connection_data.type is not None:
                db_connection.type = connection_data.type
            if connection_data.connection_string is not None:
                db_connection.connection_string = connection_data.connection_string
                try:
                    db_connection.version = database_service.get_database_version(DatabaseType.CUSTOM, connection_data.connection_string)
                except Exception:
                    pass
            
            db.commit()
            db.refresh(db_connection)
            return db_connection
        finally:
            db.close()

    def delete(self, connection_id: int) -> bool:
        db = self.SessionLocal()
        try:
            db_connection = db.query(SavedConnection).filter(SavedConnection.id == connection_id).first()
            if not db_connection:
                return False
            
            db.delete(db_connection)
            db.commit()
            return True
        finally:
            db.close()

connection_service = ConnectionService()
