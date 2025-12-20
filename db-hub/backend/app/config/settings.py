from pydantic_settings import BaseSettings
from typing import List
from urllib.parse import quote_plus


class Settings(BaseSettings):
    mysql_host: str = "localhost"
    mysql_port: int = 9306
    mysql_user: str = "luisdotcom"
    mysql_password: str
    mysql_database: str = "master"
    

    postgres_host: str = "localhost"
    postgres_port: int = 9432
    postgres_user: str = "luisdotcom"
    postgres_password: str
    postgres_database: str = "master"
    

    sqlserver_host: str = "localhost"
    sqlserver_port: int = 9433
    sqlserver_user: str = "sa"
    sqlserver_password: str
    sqlserver_database: str = "master"
    

    api_host: str = "0.0.0.0"
    api_port: int = 9000
    cors_origins: str = "http://localhost:5173,http://localhost:9090,http://127.0.0.1:5173,http://127.0.0.1:9090,http://localhost:3000"
    
    auth_username: str = "developer"
    auth_password: str = "this-is-a-secure-password-100%"
    session_secret: str = "change-this-secret-in-production-use-a-random-string"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    @property
    def mysql_connection_string(self) -> str:

        encoded_password = quote_plus(self.mysql_password)
        return (
            f"mysql+pymysql://{self.mysql_user}:{encoded_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
        )
    
    @property
    def postgres_connection_string(self) -> str:

        encoded_password = quote_plus(self.postgres_password)
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{encoded_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_database}"
        )
    
    @property
    def sqlserver_connection_string(self) -> str:

        encoded_password = quote_plus(self.sqlserver_password)
        return (
            f"mssql+pyodbc://{self.sqlserver_user}:{encoded_password}"
            f"@{self.sqlserver_host}:{self.sqlserver_port}/{self.sqlserver_database}"
            f"?driver=ODBC+Driver+17+for+SQL+Server"
        )
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
