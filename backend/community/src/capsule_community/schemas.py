"""Pydantic contracts — profile / members / events / projections (ADR 071 D3/D4)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ---- profile -----------------------------------------------------------------
class ProfileOut(BaseModel):
    user_id: int
    nick: str
    bio: str | None = None
    avatar_url: str | None = None
    contacts: dict = Field(default_factory=dict)
    created_at: datetime


class ProfileUpdate(BaseModel):
    """PATCH-like PUT — only provided fields are applied (None = leave as-is)."""

    nick: str | None = Field(default=None, min_length=3, max_length=64)
    bio: str | None = Field(default=None, max_length=2000)
    contacts: dict | None = None


class MemberOut(BaseModel):
    """Public member-card — nick + avatar only (ADR 071 D3)."""

    user_id: int
    nick: str
    avatar_url: str | None = None


# ---- events ------------------------------------------------------------------
class EventIn(BaseModel):
    user_id: int
    source_app: str = Field(min_length=1, max_length=64)
    kind: str = Field(min_length=1, max_length=128)
    payload: dict = Field(default_factory=dict)


class EventBatchIn(BaseModel):
    events: list[EventIn] = Field(min_length=1)


class EventBatchOut(BaseModel):
    inserted: int


# ---- projections -------------------------------------------------------------
class StatsOut(BaseModel):
    user_id: int
    total_points: int
    per_app: dict[str, dict] = Field(default_factory=dict)


class LeaderboardEntry(BaseModel):
    user_id: int
    nick: str
    avatar_url: str | None = None
    points: int


class LeaderboardOut(BaseModel):
    app: str | None = None
    entries: list[LeaderboardEntry] = Field(default_factory=list)
