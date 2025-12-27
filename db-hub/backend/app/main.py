from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.api.routes import query_router
from app.api.routes.auth_routes import router as auth_router
from app.api.routes.history_routes import router as history_router
from app.api.connections import router as connections_router
from app.api.endpoints.files import router as files_router
from app.core.auth_middleware import AuthMiddleware
from app.core.db_init import init_mysql_permissions
from contextlib import asynccontextmanager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_mysql_permissions()
    yield

app = FastAPI(
    title="Database Query API",
    description="Modern API for executing queries on MySQL and PostgreSQL databases",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)



app.add_middleware(AuthMiddleware)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(query_router)
app.include_router(history_router)
app.include_router(connections_router)
app.include_router(files_router, prefix="/api/files", tags=["Files"])


@app.get("/")
async def root():
    return {
        "message": "Database Query API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )
