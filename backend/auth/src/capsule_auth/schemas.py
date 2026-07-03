"""Pydantic models — register/login/me contract (ADR 068 D2)."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from .enums import Role


class RegisterIn(BaseModel):
    login: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8)

    @field_validator("login")
    @classmethod
    def _normalize_login(cls, v: str) -> str:
        return v.strip().lower()


class LoginIn(BaseModel):
    login: str
    password: str

    @field_validator("login")
    @classmethod
    def _normalize_login(cls, v: str) -> str:
        return v.strip().lower()


class UserOut(BaseModel):
    id: int
    login: str
    role: Role
