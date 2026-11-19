from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app.core.access import SESSION_COOKIE, SESSION_SECONDS, Identity, current_identity, login, revoke_session
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


class Credentials(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256, repr=False)


@router.post("/login", response_model=Identity, response_model_exclude_none=True)
def sign_in(data: Credentials, request: Request, response: Response):
    identity, token = login(data.username.strip().lower(), data.password,
                            request.client.host if request.client else "unknown",
                            request.cookies.get(SESSION_COOKIE))
    response.set_cookie(SESSION_COOKIE, token, max_age=SESSION_SECONDS, httponly=True,
                        secure=settings.FORENTRACE_COOKIE_SECURE, samesite="strict", path=settings.API_V1_STR)
    return identity


@router.get("/session", response_model=Identity, response_model_exclude_none=True)
def session(request: Request):
    identity = current_identity(request)
    if identity is None:
        raise HTTPException(503, "Login requires PostgreSQL.")
    return identity


@router.post("/logout", status_code=204)
def sign_out(request: Request, response: Response):
    revoke_session(request)
    response.delete_cookie(SESSION_COOKIE, path=settings.API_V1_STR, httponly=True,
                           secure=settings.FORENTRACE_COOKIE_SECURE, samesite="strict")
