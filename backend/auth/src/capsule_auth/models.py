"""ORM models — users + identities + sessions (ADR 068 D2).

`User` is the account core; `Identity` is the login-strategy axis (a new way
to sign in — telegram, oauth — is an additive row, never a core-schema
change); `UserSession` is an opaque-token session with a stored hash only
(the raw token lives in the cookie, never in the DB — ADR 068 D3).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base
from .enums import Role
from .utils import utcnow


def _enum(enum_cls: type, name: str) -> SAEnum:
    """Portable string-valued enum column (no native ENUM type)."""
    return SAEnum(
        enum_cls,
        name=name,
        native_enum=False,
        validate_strings=True,
        values_callable=lambda e: [m.value for m in e],
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    login: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    role: Mapped[Role] = mapped_column(_enum(Role, "role"), nullable=False, default=Role.MEMBER)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    identities: Mapped[list[Identity]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    sessions: Mapped[list[UserSession]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Identity(Base):
    """Login-strategy axis (ADR 068 D2). credentials now; telegram/oauth-* later."""

    __tablename__ = "identities"
    __table_args__ = (
        UniqueConstraint("provider", "external_id", name="uq_identities_provider_external_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String, nullable=False)
    external_id: Mapped[str] = mapped_column(String, nullable=False)
    secret_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates="identities")


class UserSession(Base):
    """Opaque session (ADR 068 D3). Table name `sessions`; class avoids
    shadowing `sqlalchemy.orm.Session`, which every module here also imports."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates="sessions")
