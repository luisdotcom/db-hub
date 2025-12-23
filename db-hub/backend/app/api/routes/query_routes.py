from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from typing import List
import logging
import os

from app.models import (
    QueryRequest, QueryResponse, DatabaseType, ExportOptions,
    UpdateRowRequest, DeleteRowRequest
)
from app.services import database_service, export_service
from app.core.exceptions import QueryExecutionError, DatabaseConnectionError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/query", tags=["Query"])


@router.post("/execute", response_model=QueryResponse, status_code=status.HTTP_200_OK)
async def execute_query(request: QueryRequest) -> QueryResponse:
    try:
        columns, rows, rows_affected = database_service.execute_query(
            db_type=request.database_type,
            query=request.query,
            connection_string=request.connection_string
        )
        
        return QueryResponse(
            success=True,
            columns=columns,
            rows=rows,
            rows_affected=rows_affected,
            message="Query executed successfully"
        )
        
    except QueryExecutionError as e:
        logger.error(f"Query execution error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseConnectionError as e:
        logger.error(f"Database connection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


@router.get("/databases/{database_type}", response_model=List[str])
async def get_databases(database_type: DatabaseType) -> List[str]:
    try:
        databases = database_service.get_databases(database_type)
        return databases
    except Exception as e:
        logger.error(f"Error getting databases: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve databases: {str(e)}"
        )


@router.post("/databases/{database_type}", status_code=status.HTTP_201_CREATED)
async def create_database(database_type: DatabaseType, database_name: str):
    try:
        database_service.create_database(database_type, database_name)
        return {"success": True, "message": f"Database '{database_name}' created successfully"}
    except Exception as e:
        logger.error(f"Error creating database: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create database: {str(e)}"
        )


@router.delete("/databases/{database_type}", status_code=status.HTTP_200_OK)
async def delete_database(database_type: DatabaseType, database_name: str, connection_string: str = None):
    try:
        database_service.delete_database(database_type, database_name, connection_string)
        return {"success": True, "message": f"Database '{database_name}' deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting database: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete database: {str(e)}"
        )



@router.put("/databases/{database_type}/select")
async def select_database(database_type: DatabaseType, database_name: str):
    try:
        database_service.select_database(database_type, database_name)
        return {"success": True, "message": f"Switched to database '{database_name}'"}
    except Exception as e:
        logger.error(f"Error selecting database: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to select database: {str(e)}"
        )


@router.get("/tables/{database_type}", response_model=List[str])
async def get_tables(database_type: DatabaseType) -> List[str]:
    try:
        tables = database_service.get_tables(database_type)
        return tables
    except Exception as e:
        logger.error(f"Error getting tables: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tables: {str(e)}"
        )


@router.get("/schema/{database_type}/{table_name}")
async def get_table_schema(database_type: DatabaseType, table_name: str):
    try:
        schema = database_service.get_table_schema(database_type, table_name)
        return {"table": table_name, "columns": schema}
    except Exception as e:
        logger.error(f"Error getting table schema: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve table schema: {str(e)}"
        )


@router.get("/schema/primary-keys/{database_type}/{table_name}", response_model=List[str])
async def get_primary_keys(database_type: DatabaseType, table_name: str, connection_string: str = None) -> List[str]:
    try:
        pks = database_service.get_primary_keys(database_type, table_name, connection_string)
        return pks
    except Exception as e:
        logger.error(f"Error getting primary keys: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve primary keys: {str(e)}"
        )


@router.post("/data/update", response_model=bool)
async def update_table_row(request: UpdateRowRequest) -> bool:
    try:
        success = database_service.update_table_row(
            request.database_type,
            request.table_name,
            request.pk_data,
            request.new_data,
            request.connection_string
        )
        return success
    except Exception as e:
        logger.error(f"Error updating row: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update row: {str(e)}"
        )


@router.post("/data/delete", response_model=bool)
async def delete_table_row(request: DeleteRowRequest) -> bool:
    try:
        success = database_service.delete_table_row(
            request.database_type,
            request.table_name,
            request.pk_data,
            request.connection_string
        )
        return success
    except Exception as e:
        logger.error(f"Error deleting row: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete row: {str(e)}"
        )


@router.get("/views/{database_type}", response_model=List[str])
async def get_views(database_type: DatabaseType) -> List[str]:
    try:
        views = database_service.get_views(database_type)
        return views
    except Exception as e:
        logger.error(f"Error getting views: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve views: {str(e)}"
        )


@router.get("/procedures/{database_type}")
async def get_procedures(database_type: DatabaseType):
    try:
        procedures = database_service.get_procedures(database_type)
        return procedures
    except Exception as e:
        logger.error(f"Error getting procedures: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve procedures: {str(e)}"
        )


@router.get("/functions/{database_type}")
async def get_functions(database_type: DatabaseType):
    try:
        functions = database_service.get_functions(database_type)
        return functions
    except Exception as e:
        logger.error(f"Error getting functions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve functions: {str(e)}"
        )


@router.get("/triggers/{database_type}")
async def get_triggers(database_type: DatabaseType):
    try:
        triggers = database_service.get_triggers(database_type)
        return triggers
    except Exception as e:
        logger.error(f"Error getting triggers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve triggers: {str(e)}"
        )



@router.get("/connection/test/{database_type}")
async def test_connection(database_type: DatabaseType):
    try:
        is_connected = database_service.test_connection(database_type)
        return {
            "database_type": database_type,
            "connected": is_connected,
            "message": "Connection successful" if is_connected else "Connection failed"
        }
    except Exception as e:
        logger.error(f"Error testing connection: {str(e)}")
        return {
            "database_type": database_type,
            "connected": False,
            "message": str(e)
        }


@router.post("/export/{database_type}/{database_name}")
async def export_database_endpoint(database_type: str, database_name: str, options: ExportOptions, connection_string: str = None):
    try:
        file_path = await export_service.export_database(database_type, database_name, connection_string, options)
        
        return FileResponse(
            path=file_path,
            filename=f"{database_name}_backup.sql",
            media_type='application/sql',
            background=BackgroundTask(os.unlink, file_path)
        )
    except NotImplementedError as e:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(e))
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Export failed: {str(e)}")
