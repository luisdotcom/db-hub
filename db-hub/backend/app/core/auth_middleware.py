from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Dict
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    
    def __init__(self):
        self.sessions: Dict[str, dict] = {}
    
    def create_session(self, username: str) -> str:
        expiry = datetime.utcnow() + timedelta(hours=24)
        payload = {
            "username": username,
            "exp": expiry
        }
        token = jwt.encode(payload, settings.session_secret, algorithm="HS256")
        self.sessions[token] = {
            "username": username,
            "expiry": expiry
        }
        return token
    
    def validate_session(self, token: str) -> dict | None:
        try:
            payload = jwt.decode(token, settings.session_secret, algorithms=["HS256"])
            
            if datetime.utcnow() > datetime.fromtimestamp(payload.get("exp", 0)):
                self.sessions.pop(token, None)
                return None
            
            if token in self.sessions:
                return {"username": payload.get("username")}
            return None
        except JWTError:
            return None
    
    def delete_session(self, token: str):
        self.sessions.pop(token, None)


session_manager = SessionManager()


class AuthMiddleware(BaseHTTPMiddleware):
    
    PUBLIC_PATHS = [
        "/",
        "/health",
        "/auth/login",
        "/auth/session",
        "/auth/logout",
        "/api/docs",
        "/api/redoc",
        "/openapi.json"
    ]
    
    async def dispatch(self, request: Request, call_next):
        
        if request.method == "OPTIONS" or request.url.path in self.PUBLIC_PATHS:
            return await call_next(request)
        
        token = request.cookies.get("session_token")
        
        if not token:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Not authenticated"}
            )
        
        session = session_manager.validate_session(token)
        
        if not session:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid or expired session"}
            )
        
        request.state.user = session
        return await call_next(request)
