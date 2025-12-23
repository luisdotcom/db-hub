from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from app.services.history_service import history_service
from app.models.history_models import HistoryResponse

router = APIRouter(prefix="/api/history", tags=["History"])

class CreateHistoryRequest(BaseModel):
    query_text: str
    database_name: Optional[str] = None
    status: str = "success"
    execution_time_ms: Optional[float] = 0
    rows_affected: Optional[int] = 0

@router.get("/", response_model=List[HistoryResponse])
def get_history(limit: int = 50):
    return history_service.get_history(limit)

@router.post("/", response_model=HistoryResponse)
def add_history(request: CreateHistoryRequest):
    entry = history_service.add_entry(
        query_text=request.query_text,
        database_name=request.database_name,
        status=request.status,
        execution_time_ms=request.execution_time_ms,
        rows_affected=request.rows_affected
    )
    if not entry:
        raise HTTPException(status_code=500, detail="Failed to save history entry")
    return entry

@router.delete("/{id}")
def delete_history_item(id: int):
    success = history_service.delete_entry(id)
    if not success:
        raise HTTPException(status_code=404, detail="History entry not found")
    return {"message": "History entry deleted successfully"}

@router.delete("/")
def clear_history():
    history_service.clear_history()
    return {"message": "History cleared successfully"}
