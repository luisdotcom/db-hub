from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
import logging
import re

from app.config import settings
from app.models import DatabaseType
from app.core.exceptions import (
    DatabaseConnectionError,
    QueryExecutionError,
    InvalidDatabaseTypeError
)

logger = logging.getLogger(__name__)


class DatabaseService:
    
    def __init__(self):
        self._engines: Dict[DatabaseType, Optional[Engine]] = {
            DatabaseType.MYSQL: None,
            DatabaseType.POSTGRES: None,
            DatabaseType.SQLSERVER: None
        }
        self._custom_engines: Dict[str, Engine] = {}
    
    def _get_connection_string(self, db_type: DatabaseType) -> str:
        if db_type == DatabaseType.MYSQL:
            return settings.mysql_connection_string
        elif db_type == DatabaseType.SQLSERVER:
            return settings.sqlserver_connection_string
        elif db_type == DatabaseType.POSTGRES:
            return settings.postgres_connection_string
        else:
            raise InvalidDatabaseTypeError(f"Unsupported database type: {db_type}")
    
    def _get_engine(self, db_type: DatabaseType, connection_string: Optional[str] = None) -> Engine:
        if connection_string:
            return create_engine(
                connection_string,
                pool_pre_ping=True,
                pool_size=settings.db_pool_size,
                max_overflow=settings.db_max_overflow,
                pool_recycle=settings.db_pool_recycle,
                pool_timeout=settings.db_pool_timeout,
                execution_options={"timeout": settings.db_query_timeout}
            )

        if self._engines[db_type] is None:
            try:
                connection_string = self._get_connection_string(db_type)
                self._engines[db_type] = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_size=settings.db_pool_size,
                    max_overflow=settings.db_max_overflow,
                    pool_recycle=settings.db_pool_recycle,
                    pool_timeout=settings.db_pool_timeout,
                    execution_options={"timeout": settings.db_query_timeout}
                )
                logger.info(f"Created engine for {db_type.value}")
            except Exception as e:
                logger.error(f"Failed to create engine for {db_type.value}: {str(e)}")
                raise DatabaseConnectionError(f"Failed to connect to {db_type.value}: {str(e)}")
        
        return self._engines[db_type]
    
    def test_connection(self, db_type: DatabaseType) -> bool:
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
        try:

            if db_type == DatabaseType.CUSTOM and connection_string:
                engine = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_size=settings.db_pool_size,
                    max_overflow=settings.db_max_overflow,
                    pool_recycle=settings.db_pool_recycle,
                    pool_timeout=settings.db_pool_timeout,
                    execution_options={"timeout": settings.db_query_timeout}
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
            error_msg = str(e).lower()
            if "1044" in error_msg or "1142" in error_msg or "access denied" in error_msg or "insufficient_privilege" in error_msg or "permission denied" in error_msg or "42501" in error_msg:
                 logger.error(f"Permission denied creating database {database_name}: {e}")
                 raise QueryExecutionError(f"Permission denied: You do not have sufficient privileges to create database '{database_name}'. Please check your user permissions.")
            
            logger.error(f"Failed to create database {database_name} for {db_type.value}: {str(e)}")
            raise

    def delete_database(self, db_type: DatabaseType, database_name: str, connection_string: Optional[str] = None) -> bool:
        try:
            if db_type == DatabaseType.CUSTOM and connection_string:
                engine = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_size=settings.db_pool_size,
                    max_overflow=settings.db_max_overflow,
                    pool_recycle=settings.db_pool_recycle,
                    pool_timeout=settings.db_pool_timeout,
                    execution_options={"timeout": settings.db_query_timeout}
                )
                if 'mysql' in connection_string:
                    dialect = DatabaseType.MYSQL
                elif 'postgresql' in connection_string or 'postgres' in connection_string:
                    dialect = DatabaseType.POSTGRES
                elif 'mssql' in connection_string:
                    dialect = DatabaseType.SQLSERVER
                else:
                    dialect = DatabaseType.MYSQL 
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
            error_msg = str(e).lower()
            if "1044" in error_msg or "1142" in error_msg or "access denied" in error_msg or "insufficient_privilege" in error_msg or "permission denied" in error_msg or "42501" in error_msg:
                 logger.error(f"Permission denied deleting database {database_name}: {e}")
                 raise QueryExecutionError(f"Permission denied: You do not have sufficient privileges to delete database '{database_name}'. Please check your user permissions.")

            logger.error(f"Failed to delete database {database_name} for {db_type.value}: {str(e)}")
            raise

    
    def select_database(self, db_type: DatabaseType, database_name: str) -> bool:
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
                pool_size=settings.db_pool_size,
                max_overflow=settings.db_max_overflow,
                pool_recycle=settings.db_pool_recycle,
                pool_timeout=settings.db_pool_timeout,
                execution_options={"timeout": settings.db_query_timeout}
            )
            
            logger.info(f"Selected database {database_name} on {db_type.value}")
            return True
        except Exception as e:
            logger.error(f"Failed to select database {database_name} for {db_type.value}: {str(e)}")
            raise

    def get_tables(self, db_type: DatabaseType) -> List[str]:
        try:
            engine = self._get_engine(db_type)
            inspector = inspect(engine)
            return inspector.get_table_names()
        except Exception as e:
            logger.error(f"Failed to get tables for {db_type.value}: {str(e)}")
            return []
    
    def get_table_schema(self, db_type: DatabaseType, table_name: str, connection_string: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            engine = self._get_engine(db_type, connection_string)
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

    def get_primary_keys(self, db_type: DatabaseType, table_name: str, connection_string: Optional[str] = None) -> List[str]:
        try:
            if db_type == DatabaseType.CUSTOM and connection_string:
                engine = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_size=settings.db_pool_size,
                    max_overflow=settings.db_max_overflow,
                    pool_recycle=settings.db_pool_recycle,
                    pool_timeout=settings.db_pool_timeout,
                    execution_options={"timeout": settings.db_query_timeout}
                )
            else:
                engine = self._get_engine(db_type)

            inspector = inspect(engine)
            pk_constraint = inspector.get_pk_constraint(table_name)
            return pk_constraint.get("constrained_columns", [])
        except Exception as e:
            logger.error(f"Failed to get primary keys for table {table_name}: {str(e)}")
            return []

    def get_foreign_keys(self, db_type: DatabaseType, table_name: str, connection_string: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            if db_type == DatabaseType.CUSTOM and connection_string:
                engine = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_size=settings.db_pool_size,
                    max_overflow=settings.db_max_overflow,
                    pool_recycle=settings.db_pool_recycle,
                    pool_timeout=settings.db_pool_timeout,
                    execution_options={"timeout": settings.db_query_timeout}
                )
            else:
                engine = self._get_engine(db_type)

            inspector = inspect(engine)
            return inspector.get_foreign_keys(table_name)
        except Exception as e:
            logger.error(f"Failed to get foreign keys for table {table_name}: {str(e)}")
            return []

    def get_indexes(self, db_type: DatabaseType, table_name: str, connection_string: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            if db_type == DatabaseType.CUSTOM and connection_string:
                engine = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_size=settings.db_pool_size,
                    max_overflow=settings.db_max_overflow,
                    pool_recycle=settings.db_pool_recycle,
                    pool_timeout=settings.db_pool_timeout,
                    execution_options={"timeout": settings.db_query_timeout}
                )
            else:
                engine = self._get_engine(db_type)

            inspector = inspect(engine)
            return inspector.get_indexes(table_name)
        except Exception as e:
            logger.error(f"Failed to get indexes for table {table_name}: {str(e)}")
            return []

    def update_table_row(
        self,
        db_type: DatabaseType,
        table_name: str,
        pk_data: Dict[str, Any],
        new_data: Dict[str, Any],
        connection_string: Optional[str] = None
    ) -> bool:
        try:
            if not pk_data:
                raise ValueError("Primary key data is required for updates")

            if db_type == DatabaseType.CUSTOM and connection_string:
                engine = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_size=settings.db_pool_size,
                    max_overflow=settings.db_max_overflow,
                    pool_recycle=settings.db_pool_recycle,
                    pool_timeout=settings.db_pool_timeout,
                    execution_options={"timeout": settings.db_query_timeout}
                )
            else:
                engine = self._get_engine(db_type)
            
            set_clauses = [f"{col}=:new_{col}" for col in new_data.keys()]
            where_clauses = [f"{col}=:pk_{col}" for col in pk_data.keys()]
            
            query = text(f"UPDATE {table_name} SET {', '.join(set_clauses)} WHERE {' AND '.join(where_clauses)}")
            
            params = {}
            for col, val in new_data.items():
                params[f"new_{col}"] = val
            for col, val in pk_data.items():
                params[f"pk_{col}"] = val
                
            with engine.connect() as connection:
                result = connection.execute(query, params)
                connection.commit()
                return result.rowcount > 0
                
        except Exception as e:
            logger.error(f"Failed to update row in {table_name}: {str(e)}")
            raise QueryExecutionError(f"Update failed: {str(e)}")

    def delete_table_row(
        self,
        db_type: DatabaseType,
        table_name: str,
        pk_data: Dict[str, Any],
        connection_string: Optional[str] = None
    ) -> bool:
        try:
            if not pk_data:
                raise ValueError("Primary key data is required for deletion")
                
            if db_type == DatabaseType.CUSTOM and connection_string:
                engine = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_size=settings.db_pool_size,
                    max_overflow=settings.db_max_overflow,
                    pool_recycle=settings.db_pool_recycle,
                    pool_timeout=settings.db_pool_timeout,
                    execution_options={"timeout": settings.db_query_timeout}
                )
            else:
                engine = self._get_engine(db_type)
            
            where_clauses = [f"{col}=:pk_{col}" for col in pk_data.keys()]
            query = text(f"DELETE FROM {table_name} WHERE {' AND '.join(where_clauses)}")
            
            params = {f"pk_{col}": val for col, val in pk_data.items()}
            
            with engine.connect() as connection:
                result = connection.execute(query, params)
                connection.commit()
                return result.rowcount > 0
                
        except Exception as e:
            logger.error(f"Failed to delete row from {table_name}: {str(e)}")
            raise QueryExecutionError(f"Deletion failed: {str(e)}")
    
    def get_views(self, db_type: DatabaseType) -> List[str]:
        try:
            engine = self._get_engine(db_type)
            inspector = inspect(engine)
            return inspector.get_view_names()
        except Exception as e:
            logger.error(f"Failed to get views for {db_type.value}: {str(e)}")
            return []
    
    def get_procedures(self, db_type: DatabaseType) -> List[Dict[str, Any]]:
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
        for db_type, engine in self._engines.items():
            if engine is not None:
                engine.dispose()
                logger.info(f"Closed connection for {db_type.value}")
        self._engines = {db_type: None for db_type in DatabaseType}

    def get_database_version(self, db_type: DatabaseType, connection_string: Optional[str] = None) -> str:
        try:
            if db_type == DatabaseType.CUSTOM and connection_string:
                engine = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_size=settings.db_pool_size,
                    max_overflow=settings.db_max_overflow,
                    pool_recycle=settings.db_pool_recycle,
                    pool_timeout=settings.db_pool_timeout,
                    execution_options={"timeout": settings.db_query_timeout}
                )
            else:
                engine = self._get_engine(db_type)
            
            with engine.connect() as connection:
                if db_type == DatabaseType.MYSQL or (db_type == DatabaseType.CUSTOM and 'mysql' in str(engine.url)):
                    result = connection.execute(text("SELECT VERSION()"))
                    version_str = result.scalar()
                elif db_type == DatabaseType.POSTGRES or (db_type == DatabaseType.CUSTOM and 'postgres' in str(engine.url)):
                    result = connection.execute(text("SELECT version()"))
                    version_str = result.scalar() 
                elif db_type == DatabaseType.SQLSERVER or (db_type == DatabaseType.CUSTOM and 'mssql' in str(engine.url)):
                    result = connection.execute(text("SELECT @@VERSION"))
                    version_str = result.scalar()
                else:
                    return "Unknown"
                
                if version_str and version_str != "Unknown":
                    match = re.search(r'(\d+\.\d+(\.\d+)?)', version_str)
                    if match:
                        return match.group(1)
                    
                    match_year = re.search(r'SQL Server (\d{4})', version_str)
                    if match_year:
                        return match_year.group(1)
                    
                    return version_str.split('\n')[0]
                    
                return "Unknown"
        except Exception as e:
            logger.error(f"Failed to get version for {db_type.value}: {str(e)}")
            return "Unknown"



    def get_schema_summary(self, db_type: DatabaseType, connection_string: Optional[str] = None) -> Dict[str, List[str]]:
        try:
            if db_type == DatabaseType.CUSTOM and connection_string:
                engine = create_engine(
                    connection_string,
                    pool_pre_ping=True,
                    pool_size=settings.db_pool_size,
                    max_overflow=settings.db_max_overflow,
                    pool_recycle=settings.db_pool_recycle,
                    pool_timeout=settings.db_pool_timeout,
                    execution_options={"timeout": settings.db_query_timeout}
                )
            else:
                engine = self._get_engine(db_type)
            
            summary = {}
            with engine.connect() as connection:
                if db_type == DatabaseType.MYSQL or (db_type == DatabaseType.CUSTOM and 'mysql' in str(engine.url)):
                    result = connection.execute(text("""
                        SELECT TABLE_NAME, COLUMN_NAME 
                        FROM information_schema.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE()
                        ORDER BY TABLE_NAME, COLUMN_NAME
                    """))
                    for row in result:
                        table = row[0]
                        column = row[1]
                        if table not in summary:
                            summary[table] = []
                        summary[table].append(column)
                        
                elif db_type == DatabaseType.POSTGRES or (db_type == DatabaseType.CUSTOM and 'postgres' in str(engine.url)):
                    result = connection.execute(text("""
                        SELECT table_name, column_name
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                        ORDER BY table_name, column_name
                    """))
                    for row in result:
                        table = row[0]
                        column = row[1]
                        if table not in summary:
                            summary[table] = []
                        summary[table].append(column)
                        
                elif db_type == DatabaseType.SQLSERVER or (db_type == DatabaseType.CUSTOM and 'mssql' in str(engine.url)):
                    result = connection.execute(text("""
                        SELECT t.name AS table_name, c.name AS column_name
                        FROM sys.tables t
                        JOIN sys.columns c ON t.object_id = c.object_id
                        ORDER BY t.name, c.name
                    """))
                    for row in result:
                        table = row[0]
                        column = row[1]
                        if table not in summary:
                            summary[table] = []
                        summary[table].append(column)
                
            return summary
        except Exception as e:
            logger.error(f"Failed to get schema summary for {db_type.value}: {str(e)}")
            return {}

database_service = DatabaseService()
