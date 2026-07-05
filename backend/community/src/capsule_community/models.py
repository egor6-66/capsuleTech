"""ORM models — profiles + events (ADR 071 D3/D4).

`Profile` is the "human" layer on top of the auth identity core (auth owns
login/role; everything social lives here). `user_id` is the auth user id — NOT
a foreign key: auth is a separate service with its own database (ADR 068 D1),
so the reference is by value, resolved via the session-passthrough client.

`Event` is an append-only journal (only ever INSERTed). Ratings/points/stats
are projections over this journal (ADR 071 D4) — a new metric is a new query
over accumulated history, never a data migration.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base
from .utils import utcnow


class Profile(Base):
    __tablename__ = "profiles"

    # Auth user id (by value — auth is a separate DB, ADR 068 D1). One row per user.
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    nick: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_key: Mapped[str | None] = mapped_column(String, nullable=True)
    contacts: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Event(Base):
    """Append-only journal row (ADR 071 D4). Written only by app backends
    (server-to-server); never updated or deleted."""

    __tablename__ = "events"
    __table_args__ = (
        Index("ix_events_user_ts", "user_id", "ts"),
        Index("ix_events_source_kind", "source_app", "kind"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    source_app: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    ts: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
