import subprocess
import os
import tempfile
from typing import Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

from sqlalchemy import create_engine, inspect, text, MetaData, Table
from sqlalchemy.schema import CreateTable
import datetime

async def _export_sqlserver(db_name: str, output_path: str):

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
            

            f.write("-- \n-- Table Structure\n-- \n\n")
            

            table_names = inspector.get_table_names()
            

            system_prefixes = ['MSreplication_', 'spt_', 'sys', 'sqlagent_']
            table_names = [
                t for t in table_names 
                if not any(t.startswith(prefix) for prefix in system_prefixes)
            ]
            
            for table_name in table_names:
                try:

                    table = Table(table_name, metadata, autoload_with=engine)
                    

                    create_stmt = str(CreateTable(table).compile(engine)).strip()
                    f.write(f"{create_stmt};\n\n")
                    

                    f.write(f"-- Data for {table_name}\n")
                    
                    with engine.connect() as conn:

                        result = conn.execute(table.select())
                        rows = result.fetchall()
                        
                        if not rows:
                            continue
                            

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

                    logger.warning(f"Skipping table {table_name} due to error: {table_error}")
                    f.write(f"-- Error exporting table {table_name}: {str(table_error)}\n\n")
                    continue
                    
        except Exception as e:
            f.write(f"\n-- Error exporting database: {str(e)}\n")
            logger.error(f"SQL Server export error: {e}")
            raise
        finally:
            engine.dispose()

async def export_database(db_type: str, db_name: str) -> Optional[str]:
    tmp_file = tempfile.NamedTemporaryFile(suffix=".sql", delete=False)
    tmp_path = tmp_file.name
    tmp_file.close()

    try:
        env = os.environ.copy()
        
        if db_type == "mysql":

            env["MYSQL_PWD"] = settings.mysql_password
            
            cmd = [
                "mysqldump",
                f"--host={settings.mysql_host}",
                f"--port={settings.mysql_port}",
                f"--user={settings.mysql_user}",
                db_name
            ]
            
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
            
        elif db_type == "postgres":
            env["PGPASSWORD"] = settings.postgres_password
            
            cmd = [
                "pg_dump",
                f"--host={settings.postgres_host}",
                f"--port={settings.postgres_port}",
                f"--username={settings.postgres_user}",
                "--format=p",
                db_name
            ]
            
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
            await _export_sqlserver(db_name, tmp_path)
            
        else:
            raise ValueError(f"Unsupported database type: {db_type}")

        return tmp_path

    except subprocess.CalledProcessError as e:
        logger.error(f"Export failed: {e.stderr}")
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise RuntimeError(f"Export failed: {e.stderr}")
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise
