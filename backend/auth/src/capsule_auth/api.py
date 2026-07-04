"""auth router — /auth/* (ADR 068 D2/D3 public contract)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session as DbSession

from . import repo
from .config import settings
from .db import get_db
from .models import User
from .schemas import LoginIn, RegisterIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

DbDep = Annotated[DbSession, Depends(get_db)]
SessionCookie = Annotated[str | None, Cookie(alias=settings.cookie_name)]


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        path="/",
    )


def _user_out(user: User) -> UserOut:
    return UserOut(id=user.id, login=user.login, role=user.role)


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterIn, response: Response, db: DbDep) -> UserOut:
    try:
        user, token = repo.register_user(db, login=body.login, password=body.password)
    except repo.LoginTaken as exc:
        raise HTTPException(status_code=409, detail="login already taken") from exc
    _set_session_cookie(response, token)
    return _user_out(user)


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: DbDep) -> UserOut:
    try:
        user, token = repo.authenticate(db, login=body.login, password=body.password)
    except repo.InvalidCredentials as exc:
        raise HTTPException(status_code=401, detail="invalid credentials") from exc
    _set_session_cookie(response, token)
    return _user_out(user)


@router.post("/logout", status_code=204)
def logout(response: Response, db: DbDep, session_token: SessionCookie = None) -> None:
    if session_token:
        repo.revoke_session(db, token=session_token)
    response.delete_cookie(key=settings.cookie_name, path="/")


@router.get("/me", response_model=UserOut)
def me(db: DbDep, session_token: SessionCookie = None) -> UserOut:
    user = repo.resolve_session(db, token=session_token) if session_token else None
    if user is None:
        raise HTTPException(status_code=401, detail="not authenticated")
    return _user_out(user)
