"""
Database service layer.
Implements clean architecture with separation of concerns.
Handles all database operations and connection management.
"""
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
import logging

from app.config import settings
from app.models import DatabaseType
from app.core.exceptions import (
    DatabaseConnectionError,
    QueryExecutionError,
    InvalidDatabaseTypeError
)

logger = logging.getLogger(__name__)


class DatabaseService:
    """
    Service class for database operations.
    Follows single responsibility principle - handles only database interactions.
    """
    
    def __init__(self):
        """Initialize database connections."""
        self._engines: Dict[DatabaseType, Optional[Engine]] = {
            DatabaseType.MYSQL: None,
            DatabaseType.POSTGRES: None,
            DatabaseType.SQLSERVER: None
        }
        self._custom_engines: Dict[str, Engine] = {}
    
    def _get_connection_string(self, db_type: DatabaseType) -> str:
        """
        Get connection string for specified database type.
        
        Args:
            db_type: Type of database
            
        Returns:
            Connection string
            
        Raises:
            InvalidDatabaseTypeError: If database type is not supported
        """
        if db_type == DatabaseType.MYSQL:
            return settings.mysql_connection_string
        elif db_type == DatabaseType.SQLSERVER:
            return settings.sqlserver_connection_string
        elif db_type == DatabaseType.POSTGRES:
            return settings.postgres_connection_string
        else:
            raise InvalidDatabaseTypeError(f"Unsupported database type: {db_type}")
    
    def _get_engine(self, db_type: DatabaseType) -> Engine:
        """
        Get or create database engine for specified type.
        
        Args:
            db_type: Type of database
            
        Returns:
            SQLAlchemy Engine instance
            
        Raises:
            DatabaseConnectionError: If connection fails
        """
        if self._engines[db_type] is None:
            try:
                connection_string = self._get_connection_string(db_type)
                self._engines[db_type] = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_recycle=3600
                )
                logger.info(f"Created engine for {db_type.value}")
            except Exception as e:
                logger.error(f"Failed to create engine for {db_type.value}: {str(e)}")
                raise DatabaseConnectionError(f"Failed to connect to {db_type.value}: {str(e)}")
        
        return self._engines[db_type]
    
    def test_connection(self, db_type: DatabaseType) -> bool:
        """
        Test database connection.
        
        Args:
            db_type: Type of database to test
            
        Returns:
            True if connection successful, False otherwise
        """
        try:
            engine = self._get_engine(db_type)
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Connection test failed for {db_type.value}: {str(e)}")
            return False
    
    def execute_query(
        self,
        db_type: DatabaseType,
        query: str,
        connection_string: Optional[str] = None
    ) -> Tuple[Optional[List[str]], Optional[List[Dict[str, Any]]], Optional[int]]:
        """
        Execute a SQL query and return results.
        
        Args:
            db_type: Type of database to query
            query: SQL query to execute
            connection_string: Custom connection string (for custom database type)
            
        Returns:
            Tuple of (columns, rows, rows_affected)
            
        Raises:
            QueryExecutionError: If query execution fails
        """
        try:

            if db_type == DatabaseType.CUSTOM and connection_string:
                engine = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_recycle=3600
                )
            else:
                engine = self._get_engine(db_type)
            
            with engine.connect() as connection:
                result = connection.execute(text(query))
                

                if result.returns_rows:
                    columns = list(result.keys())
                    rows = [dict(row._mapping) for row in result]
                    connection.commit()
                    return columns, rows, None
                

                else:
                    connection.commit()
                    return None, None, result.rowcount
                    
        except SQLAlchemyError as e:
            logger.error(f"Query execution failed: {str(e)}")
            raise QueryExecutionError(f"Query execution failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during query execution: {str(e)}")
            raise QueryExecutionError(f"Unexpected error: {str(e)}")
    
    def get_databases(self, db_type: DatabaseType) -> List[str]:
        """
        Get list of databases in the database server.
        
        Args:
            db_type: Type of database
            
        Returns:
            List of database names
        """
        try:
            engine = self._get_engine(db_type)
            with engine.connect() as connection:
                if db_type == DatabaseType.MYSQL:
                    result = connection.execute(text("SHOW DATABASES"))

                    system_dbs = {'information_schema', 'mysql', 'performance_schema', 'sys'}
                    return [row[0] for row in result if row[0] not in system_dbs]
                elif db_type == DatabaseType.POSTGRES:
                    result = connection.execute(text(
                        "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
                    ))

                    system_dbs = {'postgres'}
                    return [row[0] for row in result if row[0] not in system_dbs]
                elif db_type == DatabaseType.SQLSERVER:
                    result = connection.execute(text(
                        "SELECT name FROM sys.databases ORDER BY name"
                    ))
                    return [row[0] for row in result]
                else:
                    return []
        except Exception as e:
            logger.error(f"Failed to get databases for {db_type.value}: {str(e)}")
            return []
    
    def create_database(self, db_type: DatabaseType, database_name: str) -> bool:
        """
        Create a new database.
        
        Args:
            db_type: Type of database
            database_name: Name of the database to create
            
        Returns:
            True if database was created successfully
        """
        try:
            engine = self._get_engine(db_type)
            with engine.connect() as connection:

                if db_type == DatabaseType.MYSQL:
                    connection.execute(text(f"CREATE DATABASE `{database_name}`"))
                    connection.commit()
                elif db_type == DatabaseType.POSTGRES:

                    conn = connection.execution_options(isolation_level="AUTOCOMMIT")
                    conn.execute(text(f'CREATE DATABASE "{database_name}"'))
                elif db_type == DatabaseType.SQLSERVER:
                    conn = connection.execution_options(isolation_level="AUTOCOMMIT")
                    conn.execute(text(f"CREATE DATABASE [{database_name}]"))
                else:
                    raise InvalidDatabaseTypeError(f"Unsupported database type: {db_type}")
                
                logger.info(f"Created database {database_name} on {db_type.value}")
                return True
        except Exception as e:
            logger.error(f"Failed to create database {database_name} for {db_type.value}: {str(e)}")
            raise

    def delete_database(self, db_type: DatabaseType, database_name: str, connection_string: Optional[str] = None) -> bool:
        """
        Delete (drop) a database.
        
        Args:
            db_type: Type of database
            database_name: Name of the database to delete
            connection_string: Custom connection string (for custom database type)
            
        Returns:
            True if database was deleted successfully
        """
        try:
            if db_type == DatabaseType.CUSTOM and connection_string:
                engine = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_recycle=3600
                )
                # Determine dialect from connection string
                if 'mysql' in connection_string:
                    dialect = DatabaseType.MYSQL
                elif 'postgresql' in connection_string or 'postgres' in connection_string:
                    dialect = DatabaseType.POSTGRES
                elif 'mssql' in connection_string:
                    dialect = DatabaseType.SQLSERVER
                else:
                    # Fallback or strict error
                    dialect = DatabaseType.MYSQL # Default ? Or better logic
            else:
                engine = self._get_engine(db_type)
                dialect = db_type
            
            with engine.connect() as connection:
                
                if dialect == DatabaseType.MYSQL:
                    connection.execute(text(f"DROP DATABASE `{database_name}`"))
                    connection.commit()
                    
                elif dialect == DatabaseType.POSTGRES:
                    conn = connection.execution_options(isolation_level="AUTOCOMMIT")
                    conn.execute(text(f"""
                        SELECT pg_terminate_backend(pid)
                        FROM pg_stat_activity
                        WHERE datname = '{database_name}' AND pid <> pg_backend_pid()
                    """))
                    conn.execute(text(f'DROP DATABASE "{database_name}"'))
                    
                elif dialect == DatabaseType.SQLSERVER:
                    conn = connection.execution_options(isolation_level="AUTOCOMMIT")
                    conn.execute(text(f"""
                        ALTER DATABASE [{database_name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                        DROP DATABASE [{database_name}];
                    """))
                    
                else:
                    raise InvalidDatabaseTypeError(f"Unsupported database type: {dialect}")
                
                logger.info(f"Deleted database {database_name} on {db_type.value}")
                return True
        except Exception as e:
            logger.error(f"Failed to delete database {database_name} for {db_type.value}: {str(e)}")
            raise

    
    def select_database(self, db_type: DatabaseType, database_name: str) -> bool:
        """
        Select/switch to a different database by recreating the engine.
        
        Args:
            db_type: Type of database
            database_name: Name of the database to select
            
        Returns:
            True if database was selected successfully
        """
        try:

            if self._engines[db_type] is not None:
                self._engines[db_type].dispose()
                self._engines[db_type] = None
            

            base_string = self._get_connection_string(db_type)
            
            if db_type == DatabaseType.MYSQL:

                parts = base_string.rsplit('/', 1)
                new_string = f"{parts[0]}/{database_name}"
            elif db_type == DatabaseType.POSTGRES:

                parts = base_string.rsplit('/', 1)
                new_string = f"{parts[0]}/{database_name}"
            elif db_type == DatabaseType.SQLSERVER:

                if '?' in base_string:
                    parts = base_string.split('?')
                    db_part = parts[0].rsplit('/', 1)
                    new_string = f"{db_part[0]}/{database_name}?{parts[1]}"
                else:
                    parts = base_string.rsplit('/', 1)
                    new_string = f"{parts[0]}/{database_name}"
            else:
                raise InvalidDatabaseTypeError(f"Unsupported database type: {db_type}")
            

            self._engines[db_type] = create_engine(
                new_string,
                pool_pre_ping=True,
                pool_recycle=3600
            )
            
            logger.info(f"Selected database {database_name} on {db_type.value}")
            return True
        except Exception as e:
            logger.error(f"Failed to select database {database_name} for {db_type.value}: {str(e)}")
            raise

    def get_tables(self, db_type: DatabaseType) -> List[str]:
        """
        Get list of tables in the database.
        
        Args:
            db_type: Type of database
            
        Returns:
            List of table names
        """
        try:
            engine = self._get_engine(db_type)
            inspector = inspect(engine)
            return inspector.get_table_names()
        except Exception as e:
            logger.error(f"Failed to get tables for {db_type.value}: {str(e)}")
            return []
    
    def get_table_schema(self, db_type: DatabaseType, table_name: str) -> List[Dict[str, Any]]:
        """
        Get schema information for a specific table.
        
        Args:
            db_type: Type of database
            table_name: Name of the table
            
        Returns:
            List of column information dictionaries
        """
        try:
            engine = self._get_engine(db_type)
            inspector = inspect(engine)
            columns = inspector.get_columns(table_name)
            
            return [
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                    "default": col.get("default"),
                }
                for col in columns
            ]
        except Exception as e:
            logger.error(f"Failed to get schema for table {table_name}: {str(e)}")
            return []
    
    def get_views(self, db_type: DatabaseType) -> List[str]:
        """
        Get list of views in the database.
        
        Args:
            db_type: Type of database
            
        Returns:
            List of view names
        """
        try:
            engine = self._get_engine(db_type)
            inspector = inspect(engine)
            return inspector.get_view_names()
        except Exception as e:
            logger.error(f"Failed to get views for {db_type.value}: {str(e)}")
            return []
    
    def get_procedures(self, db_type: DatabaseType) -> List[Dict[str, Any]]:
        """
        Get list of stored procedures in the database.
        
        Args:
            db_type: Type of database
            
        Returns:
            List of procedure information
        """
        try:
            engine = self._get_engine(db_type)
            with engine.connect() as connection:
                if db_type == DatabaseType.MYSQL:
                    result = connection.execute(text(
                        "SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES "
                        "WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE'"
                    ))
                    return [{"name": row[0], "type": row[1]} for row in result]
                elif db_type == DatabaseType.POSTGRES:
                    result = connection.execute(text(
                        "SELECT proname, prokind FROM pg_proc p "
                        "JOIN pg_namespace n ON p.pronamespace = n.oid "
                        "WHERE n.nspname = 'public' AND prokind = 'p'"
                    ))
                    return [{"name": row[0], "type": "PROCEDURE"} for row in result]
                elif db_type == DatabaseType.SQLSERVER:
                    result = connection.execute(text(
                        "SELECT name, type_desc FROM sys.procedures WHERE type = 'P'"
                    ))
                    return [{"name": row[0], "type": row[1]} for row in result]
                else:
                    return []
        except Exception as e:
            logger.error(f"Failed to get procedures for {db_type.value}: {str(e)}")
            return []
    
    def get_functions(self, db_type: DatabaseType) -> List[Dict[str, Any]]:
        """
        Get list of functions in the database.
        
        Args:
            db_type: Type of database
            
        Returns:
            List of function information
        """
        try:
            engine = self._get_engine(db_type)
            with engine.connect() as connection:
                if db_type == DatabaseType.MYSQL:
                    result = connection.execute(text(
                        "SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES "
                        "WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'FUNCTION'"
                    ))
                    return [{"name": row[0], "type": row[1]} for row in result]
                elif db_type == DatabaseType.POSTGRES:
                    result = connection.execute(text(
                        "SELECT proname, prokind FROM pg_proc p "
                        "JOIN pg_namespace n ON p.pronamespace = n.oid "
                        "WHERE n.nspname = 'public' AND prokind = 'f'"
                    ))
                    return [{"name": row[0], "type": "FUNCTION"} for row in result]
                elif db_type == DatabaseType.SQLSERVER:
                    result = connection.execute(text(
                        "SELECT name, type_desc FROM sys.objects WHERE type IN ('FN', 'IF', 'TF')"
                    ))
                    return [{"name": row[0], "type": row[1]} for row in result]
                else:
                    return []
        except Exception as e:
            logger.error(f"Failed to get functions for {db_type.value}: {str(e)}")
            return []
    
    def get_triggers(self, db_type: DatabaseType) -> List[Dict[str, Any]]:
        """
        Get list of triggers in the database.
        
        Args:
            db_type: Type of database
            
        Returns:
            List of trigger information
        """
        try:
            engine = self._get_engine(db_type)
            with engine.connect() as connection:
                if db_type == DatabaseType.MYSQL:
                    result = connection.execute(text(
                        "SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, EVENT_MANIPULATION "
                        "FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()"
                    ))
                    return [{"name": row[0], "table": row[1], "event": row[2]} for row in result]
                elif db_type == DatabaseType.POSTGRES:
                    result = connection.execute(text(
                        "SELECT t.tgname, c.relname, CASE WHEN t.tgtype & 2 = 2 THEN 'BEFORE' ELSE 'AFTER' END "
                        "FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid "
                        "JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND NOT t.tgisinternal"
                    ))
                    return [{"name": row[0], "table": row[1], "event": row[2]} for row in result]
                elif db_type == DatabaseType.SQLSERVER:
                    result = connection.execute(text(
                        "SELECT t.name, o.name as table_name, '' as event "
                        "FROM sys.triggers t JOIN sys.objects o ON t.parent_id = o.object_id"
                    ))
                    return [{"name": row[0], "table": row[1], "event": row[2]} for row in result]
                else:
                    return []
        except Exception as e:
            logger.error(f"Failed to get triggers for {db_type.value}: {str(e)}")
            return []
    
    def close_connections(self):
        """Close all database connections."""
        for db_type, engine in self._engines.items():
            if engine is not None:
                engine.dispose()
                logger.info(f"Closed connection for {db_type.value}")
        self._engines = {db_type: None for db_type in DatabaseType}



database_service = DatabaseService()
