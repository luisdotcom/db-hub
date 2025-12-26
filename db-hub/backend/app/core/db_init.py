
import logging
import time
import pymysql
from app.config import settings

logger = logging.getLogger(__name__)

def init_mysql_permissions():
    max_retries = 5
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            connection = pymysql.connect(
                host=settings.mysql_host,
                port=settings.mysql_port,
                user="root",
                password=settings.mysql_root_password,
                cursorclass=pymysql.cursors.DictCursor
            )
            
            with connection:
                with connection.cursor() as cursor:
                    logger.info(f"Granting privileges to {settings.mysql_user}...")
                    
                    cursor.execute(f"GRANT ALL PRIVILEGES ON *.* TO '{settings.mysql_user}'@'%';")
                    cursor.execute("FLUSH PRIVILEGES;")
                    
                    logger.info("MySQL privileges granted successfully.")
                    return
                    
        except pymysql.MySQLError as e:
            logger.warning(f"Attempt {attempt + 1}/{max_retries} to grant permissions failed: {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error("Failed to grant MySQL privileges after multiple attempts.")
        except Exception as e:
            logger.error(f"Unexpected error initializing MySQL permissions: {e}")
            return
