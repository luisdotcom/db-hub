from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str


class SessionResponse(BaseModel):
    authenticated: bool
    username: str | None = None
