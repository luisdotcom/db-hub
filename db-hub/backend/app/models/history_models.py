from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

Base = declarative_base()

class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, index=True)
    query_text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    database_name = Column(String, nullable=True)
    status = Column(String, default="success")
    execution_time_ms = Column(Float, nullable=True)
    rows_affected = Column(Integer, nullable=True)

class HistoryResponse(BaseModel):
    id: int
    query_text: str
    timestamp: datetime
    database_name: Optional[str]
    status: str
    execution_time_ms: Optional[float]
    rows_affected: Optional[int]

    class Config:
        orm_mode = True
