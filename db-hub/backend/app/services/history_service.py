import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.history_models import Base, QueryHistory
from datetime import datetime

logger = logging.getLogger(__name__)

class HistoryService:
    def __init__(self, db_path="sqlite:///./db_hub.db"):
        self.engine = create_engine(
            db_path,
            connect_args={"check_same_thread": False}
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self._init_db()

    def _init_db(self):
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("Internal history database initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize history database: {e}")

    def add_entry(self, query_text, database_name, status="success", execution_time_ms=0, rows_affected=0):
        session = self.SessionLocal()
        try:
            entry = QueryHistory(
                query_text=query_text,
                database_name=database_name,
                status=status,
                execution_time_ms=execution_time_ms,
                rows_affected=rows_affected,
                timestamp=datetime.utcnow()
            )
            session.add(entry)
            session.commit()
            session.refresh(entry)
            return entry
        except Exception as e:
            logger.error(f"Failed to add history entry: {e}")
            session.rollback()
        finally:
            session.close()

    def get_history(self, limit=50):
        session = self.SessionLocal()
        try:
            return session.query(QueryHistory).order_by(QueryHistory.timestamp.desc()).limit(limit).all()
        finally:
            session.close()

    def delete_entry(self, entry_id: int):
        session = self.SessionLocal()
        try:
            entry = session.query(QueryHistory).filter(QueryHistory.id == entry_id).first()
            if entry:
                session.delete(entry)
                session.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete history entry {entry_id}: {e}")
            session.rollback()
            return False
        finally:
            session.close()
    
    def clear_history(self):
        session = self.SessionLocal()
        try:
            session.query(QueryHistory).delete()
            session.commit()
        except Exception as e:
            logger.error(f"Failed to clear history: {e}")
            session.rollback()
        finally:
            session.close()

history_service = HistoryService()
