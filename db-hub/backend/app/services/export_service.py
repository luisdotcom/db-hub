import subprocess
import os
import tempfile
from typing import Optional, List
from app.config import settings
import logging
from app.models import ExportOptions

logger = logging.getLogger(__name__)

from sqlalchemy import create_engine, inspect, text, MetaData, Table
from sqlalchemy.schema import CreateTable
import datetime

from sqlalchemy.engine.url import make_url

async def _export_sqlserver(db_name: str, output_path: str, connection_string: Optional[str] = None, options: ExportOptions = None):
    if not options:
        options = ExportOptions()

    if connection_string:
        conn_str = connection_string
    else:
        base_conn = settings.sqlserver_connection_string
        if '?' in base_conn:
            parts = base_conn.split('?')
            db_part = parts[0].rsplit('/', 1)
            conn_str = f"{db_part[0]}/{db_name}?{parts[1]}"
        else:
            parts = base_conn.rsplit('/', 1)
            conn_str = f"{parts[0]}/{db_name}"

    engine = create_engine(conn_str)
    metadata = MetaData()
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"-- Database Export: {db_name}\n")
        f.write(f"-- Generated: {datetime.datetime.now()}\n\n")
        
        try:
            inspector = inspect(engine)

            if not options.tables and not options.views and not options.procedures and not options.functions and not options.triggers:
                pass

            target_tables = []
            all_tables = inspector.get_table_names()
            system_prefixes = ['MSreplication_', 'spt_', 'sys', 'sqlagent_']
            filtered_tables = [t for t in all_tables if not any(t.startswith(prefix) for prefix in system_prefixes)]

            if options.tables:
                target_tables = [t for t in filtered_tables if t in options.tables]
            elif not (options.views or options.procedures or options.functions or options.triggers):
                pass
            
            if target_tables:
                f.write("-- \n-- Table Structure\n-- \n\n")
                for table_name in target_tables:
                    try:
                        table = Table(table_name, metadata, autoload_with=engine)
                        create_stmt = str(CreateTable(table).compile(engine)).strip()
                        f.write(f"{create_stmt};\n\n")

                        if options.include_data:
                            f.write(f"-- Data for {table_name}\n")
                            with engine.connect() as conn:
                                result = conn.execute(table.select())
                                rows = result.fetchall()
                                if rows:
                                    cols = [c.name for c in table.columns]
                                    col_str = ", ".join([f"[{c}]" for c in cols])
                                    f.write(f"SET IDENTITY_INSERT [{table_name}] ON;\n")
                                    for row in rows:
                                        vals = []
                                        for val in row:
                                            if val is None:
                                                vals.append("NULL")
                                            elif isinstance(val, (int, float)):
                                                vals.append(str(val))
                                            elif isinstance(val, bool):
                                                vals.append('1' if val else '0')
                                            else:
                                                val_str = str(val).replace("'", "''")
                                                vals.append(f"'{val_str}'")
                                        val_str = ", ".join(vals)
                                        f.write(f"INSERT INTO [{table_name}] ({col_str}) VALUES ({val_str});\n")
                                    f.write(f"SET IDENTITY_INSERT [{table_name}] OFF;\n\n")
                    except Exception as table_error:
                        logger.warning(f"Skipping table {table_name}: {table_error}")
                        f.write(f"-- Error exporting table {table_name}: {str(table_error)}\n\n")
            
            def export_definitions(objects, query_template, type_label):
                if not objects:
                    return
                f.write(f"-- \n-- {type_label}\n-- \n\n")
                with engine.connect() as conn:
                    for obj in objects:
                        try:
                            sql = text(f"SELECT OBJECT_DEFINITION(OBJECT_ID(:obj)) as def")
                            res = conn.execute(sql, {"obj": obj}).scalar()
                            if res:
                                f.write(f"{res}\nGO\n\n")
                            else:
                                f.write(f"-- Definition not found for {obj}\n\n")
                        except Exception as e:
                            f.write(f"-- Error exporting {obj}: {e}\n\n")

            if options.views:
                export_definitions(options.views, None, "Views")
            
            if options.procedures:
                export_definitions(options.procedures, None, "Stored Procedures")
                
            if options.functions:
                export_definitions(options.functions, None, "Functions")
                
            if options.triggers:
                export_definitions(options.triggers, None, "Triggers")

        except Exception as e:
            f.write(f"\n-- Error exporting database: {str(e)}\n")
            logger.error(f"SQL Server export error: {e}")
            raise
        finally:
            engine.dispose()


async def export_database(db_type: str, db_name: str, connection_string: Optional[str] = None, options: ExportOptions = None) -> Optional[str]:
    tmp_file = tempfile.NamedTemporaryFile(suffix=".sql", delete=False)
    tmp_path = tmp_file.name
    tmp_file.close()
    
    if not options:
        options = ExportOptions()

    try:
        env = os.environ.copy()
        
        host = None
        port = None
        user = None
        password = None
        
        if connection_string:
            try:
                url = make_url(connection_string.replace('mysql+pymysql://', 'mysql://')
                                          .replace('postgresql+psycopg2://', 'postgresql://')
                                          .replace('mssql+pyodbc://', 'mssql://'))
                
                host = url.host
                port = url.port
                user = url.username
                password = url.password
                
                if 'mysql' in url.drivername:
                    db_type = 'mysql'
                elif 'postgresql' in url.drivername or 'postgres' in url.drivername:
                    db_type = 'postgres'
                elif 'mssql' in url.drivername:
                    db_type = 'sqlserver'
                    
            except Exception as e:
                logger.error(f"Failed to parse connection string: {e}")

        if db_type == "mysql":
            host = host or settings.mysql_host
            port = str(port) if port else str(settings.mysql_port)
            user = user or settings.mysql_user
            password = password or settings.mysql_password
            
            env["MYSQL_PWD"] = password
            
            cmd = [
                "mysqldump",
                f"--host={host}",
                f"--port={port}",
                f"--user={user}"
            ]
            
            if not options.include_data:
                cmd.append("--no-data")
            
            cmd.append("--single-transaction")
            cmd.append("--no-tablespaces")
            
            cmd.append(db_name)
            
            
            selected_tables = options.tables + options.views 
            
            if selected_tables:
                 cmd.extend(selected_tables)
            elif not (options.tables or options.views or options.procedures or options.functions or options.triggers):

                 pass

            if options.procedures or options.functions:
                cmd.append("--routines")
            
            if options.triggers:
                cmd.append("--triggers")
            else:
                cmd.append("--skip-triggers")

            logger.info(f"Exporting {db_type} database {db_name} with cmd: {' '.join(cmd)}")
            with open(tmp_path, "w") as f:
                subprocess.run(
                    cmd, 
                    stdout=f, 
                    stderr=subprocess.PIPE, 
                    env=env, 
                    check=True,
                    text=True
                )
            
        elif db_type == "postgres":
            host = host or settings.postgres_host
            port = str(port) if port else str(settings.postgres_port)
            user = user or settings.postgres_user
            password = password or settings.postgres_password
            
            env["PGPASSWORD"] = password
            
            cmd = [
                "pg_dump",
                f"--host={host}",
                f"--port={port}",
                f"--username={user}",
                "--format=p"
            ]
            
            if not options.include_data:
                cmd.append("--schema-only")
                
            for t in options.tables:
                cmd.extend(["-t", t])
            for v in options.views:
                cmd.extend(["-t", v])
            
            cmd.append(db_name)
            
            logger.info(f"Exporting {db_type} database {db_name}...")
            with open(tmp_path, "w") as f:
                subprocess.run(
                    cmd, 
                    stdout=f, 
                    stderr=subprocess.PIPE, 
                    env=env, 
                    check=True,
                    text=True
                )
        
        elif db_type == "sqlserver":
            logger.info(f"Exporting {db_type} database {db_name} using SQLAlchemy...")
            await _export_sqlserver(db_name, tmp_path, connection_string, options)
            
        else:
             raise ValueError(f"Unsupported database type: {db_type}")

        return tmp_path

    except subprocess.CalledProcessError as e:
        error_msg = e.stderr
        logger.error(f"Export failed: {error_msg}")
        
        # Check for common permission errors
        if "Access denied" in error_msg:
             raise RuntimeError(f"Permission denied: The database user does not have sufficient privileges to export this database. Details: {error_msg.strip()}")
        elif "LOCK TABLES" in error_msg:
             raise RuntimeError(f"Permission denied: The database user is missing the 'LOCK TABLES' privilege required for export. Details: {error_msg.strip()}")
        elif "PROCESS" in error_msg:
             raise RuntimeError(f"Permission denied: The database user is missing the 'PROCESS' privilege required for export. Details: {error_msg.strip()}")
        
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise RuntimeError(f"Export failed with external tool error: {error_msg}")
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise
