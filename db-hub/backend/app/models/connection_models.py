from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

Base = declarative_base()

class SavedConnection(Base):
    __tablename__ = "saved_connections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=False)  
    connection_string = Column(Text, nullable=False)
    version = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ConnectionCreate(BaseModel):
    name: str
    type: str 
    connection_string: str

class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    connection_string: Optional[str] = None

class ConnectionResponse(BaseModel):
    id: int
    name: str
    type: str
    connection_string: str
    version: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True
