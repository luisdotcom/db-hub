from fastapi import APIRouter, HTTPException, status, Response
from fastapi.responses import JSONResponse
import logging

from app.models.auth_models import LoginRequest, LoginResponse, SessionResponse
from app.core.auth_middleware import session_manager
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, response: Response):
    if request.username != settings.auth_username or request.password != settings.auth_password:
        logger.warning(f"Failed login attempt for username: {request.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    token = session_manager.create_session(request.username)
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=86400,
        samesite="lax"
    )
    
    logger.info(f"User {request.username} logged in successfully")
    
    return LoginResponse(
        success=True,
        message="Login successful"
    )

from fastapi import Cookie
from typing import Annotated

@router.get("/session", response_model=SessionResponse)
async def check_session(session_token: Annotated[str | None, Cookie()] = None):
    if not session_token:
        return SessionResponse(authenticated=False)
    
    session = session_manager.validate_session(session_token)
    
    if not session:
        return SessionResponse(authenticated=False)
    
    return SessionResponse(
        authenticated=True,
        username=session.get("username")
    )


@router.post("/logout")
async def logout(response: Response, session_token: Annotated[str | None, Cookie()] = None):
    if session_token:
        session_manager.delete_session(session_token)
    
    response.delete_cookie(key="session_token")
    
    logger.info("User logged out")
    
    return {"success": True, "message": "Logged out successfully"}
