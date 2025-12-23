from app.models.connection_models import ConnectionCreate, ConnectionResponse, ConnectionUpdate
from app.services.connection_service import connection_service

from fastapi import APIRouter, HTTPException, Depends
from typing import List

router = APIRouter(prefix="/connections", tags=["connections"])

@router.get("/", response_model=List[ConnectionResponse])
async def get_connections():
    return connection_service.get_all()

@router.post("/", response_model=ConnectionResponse)
async def create_connection(connection: ConnectionCreate):
    try:
        return connection_service.create(connection)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{connection_id}", response_model=ConnectionResponse)
async def update_connection(connection_id: int, connection: ConnectionUpdate):
    updated = connection_service.update(connection_id, connection)
    if not updated:
        raise HTTPException(status_code=404, detail="Connection not found")
    return updated

@router.delete("/{connection_id}")
async def delete_connection(connection_id: int):
    success = connection_service.delete(connection_id)
    if not success:
        raise HTTPException(status_code=404, detail="Connection not found")
    return {"message": "Connection deleted"}
