"""
Data models for query operations.
Using Pydantic for validation and clean data structures.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum


class DatabaseType(str, Enum):
    """Supported database types."""
    MYSQL = "mysql"
    POSTGRES = "postgres"
    SQLSERVER = "sqlserver"
    CUSTOM = "custom"


class QueryRequest(BaseModel):
    """Request model for executing a database query."""
    connection_string: Optional[str] = Field(None, description="Custom connection string (for custom database type)")
    database_type: DatabaseType = Field(..., description="Type of database to query")
    query: str = Field(..., min_length=1, description="SQL query to execute")
    
    class Config:
        json_schema_extra = {
            "example": {
                "database_type": "mysql",
                "query": "SELECT * FROM users LIMIT 10"
            }
        }


class QueryResponse(BaseModel):
    """Response model for query execution results."""
    success: bool = Field(..., description="Whether the query executed successfully")
    columns: Optional[List[str]] = Field(None, description="Column names from the result")
    rows: Optional[List[Dict[str, Any]]] = Field(None, description="Query result rows")
    rows_affected: Optional[int] = Field(None, description="Number of rows affected (for INSERT/UPDATE/DELETE)")
    message: Optional[str] = Field(None, description="Additional message or error description")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "columns": ["id", "name", "email"],
                "rows": [
                    {"id": 1, "name": "John Doe", "email": "john@example.com"},
                    {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
                ],
                "rows_affected": None,
                "message": "Query executed successfully"
            }
        }


class DatabaseInfo(BaseModel):
    """Information about a database connection."""
    database_type: DatabaseType
    host: str
    port: int
    database: str
    status: str
