"""DB queries — profiles + append-only events (ADR 071 D3/D4)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from .models import Event, Profile
from .schemas import EventIn


class NickTaken(Exception):
    """Requested nick is already used by another profile (409)."""


# ---- profiles ----------------------------------------------------------------
def get_profile(db: DbSession, user_id: int) -> Profile | None:
    return db.get(Profile, user_id)


def get_or_create_profile(db: DbSession, *, user_id: int, default_nick: str) -> Profile:
    """Fetch the caller's profile, auto-creating an empty one on first access
    (nick defaults to the auth login, ADR 071 D3). Falls back to a unique
    `user<id>` nick if the default collides with someone else's chosen nick."""
    profile = db.get(Profile, user_id)
    if profile is not None:
        return profile

    profile = Profile(user_id=user_id, nick=default_nick)
    db.add(profile)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        profile = Profile(user_id=user_id, nick=f"user{user_id}")
        db.add(profile)
        db.commit()
    db.refresh(profile)
    return profile


def update_profile(
    db: DbSession,
    profile: Profile,
    *,
    nick: str | None,
    bio: str | None,
    contacts: dict | None,
) -> Profile:
    if nick is not None:
        profile.nick = nick
    if bio is not None:
        profile.bio = bio
    if contacts is not None:
        profile.contacts = contacts
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise NickTaken(nick or "") from exc
    db.refresh(profile)
    return profile


def set_avatar_key(db: DbSession, profile: Profile, *, avatar_key: str) -> Profile:
    profile.avatar_key = avatar_key
    db.commit()
    db.refresh(profile)
    return profile


def list_members(db: DbSession, *, limit: int = 100, offset: int = 0) -> list[Profile]:
    return list(
        db.execute(
            select(Profile).order_by(Profile.created_at.asc()).limit(limit).offset(offset)
        ).scalars()
    )


# ---- events (append-only) ----------------------------------------------------
def insert_events(db: DbSession, events: list[EventIn]) -> int:
    """INSERT-only — the journal has no update/delete path (ADR 071 D4)."""
    db.add_all(
        Event(
            user_id=e.user_id,
            source_app=e.source_app,
            kind=e.kind,
            payload=e.payload,
        )
        for e in events
    )
    db.commit()
    return len(events)


def events_for_user(db: DbSession, user_id: int) -> list[Event]:
    return list(
        db.execute(select(Event).where(Event.user_id == user_id)).scalars()
    )


def all_events(db: DbSession, *, source_app: str | None = None) -> list[Event]:
    stmt = select(Event)
    if source_app is not None:
        stmt = stmt.where(Event.source_app == source_app)
    return list(db.execute(stmt).scalars())
