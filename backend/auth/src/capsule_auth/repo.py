"""Identity queries — register/authenticate credentials, opaque sessions.

`resolve_session` lazily reaps expired rows (ADR 068 / brief: no separate
reaper this iteration) — an expired session is deleted the moment it is
looked up, not on a schedule.
"""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from .config import settings
from .enums import Role
from .models import Identity, User, UserSession
from .security import hash_password, hash_token, new_session_token, verify_password
from .utils import utcnow

CREDENTIALS_PROVIDER = "credentials"


class LoginTaken(Exception):
    """login already registered (409)."""


class InvalidCredentials(Exception):
    """login/password pair does not resolve (401)."""


def _find_credentials_identity(db: DbSession, *, login: str) -> Identity | None:
    return db.execute(
        select(Identity).where(
            Identity.provider == CREDENTIALS_PROVIDER, Identity.external_id == login
        )
    ).scalar_one_or_none()


def _create_session(db: DbSession, user: User) -> str:
    token = new_session_token()
    now = utcnow()
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=hash_token(token),
            created_at=now,
            expires_at=now + timedelta(days=settings.session_ttl_days),
            last_seen=now,
        )
    )
    return token


def register_user(db: DbSession, *, login: str, password: str) -> tuple[User, str]:
    if _find_credentials_identity(db, login=login) is not None:
        raise LoginTaken(login)

    user = User(login=login, role=Role.MEMBER)
    db.add(user)
    db.flush()  # assign user.id before the Identity FK needs it

    db.add(
        Identity(
            user_id=user.id,
            provider=CREDENTIALS_PROVIDER,
            external_id=login,
            secret_hash=hash_password(password),
        )
    )
    token = _create_session(db, user)
    db.commit()
    db.refresh(user)
    return user, token


def authenticate(db: DbSession, *, login: str, password: str) -> tuple[User, str]:
    identity = _find_credentials_identity(db, login=login)
    if identity is None or identity.secret_hash is None or not verify_password(
        password, identity.secret_hash
    ):
        raise InvalidCredentials(login)

    user = db.get(User, identity.user_id)
    token = _create_session(db, user)
    db.commit()
    return user, token


def resolve_session(db: DbSession, *, token: str) -> User | None:
    """Live user for a raw cookie token, or None (missing/expired/revoked)."""
    token_hash = hash_token(token)
    sess = db.execute(
        select(UserSession).where(UserSession.token_hash == token_hash)
    ).scalar_one_or_none()
    if sess is None:
        return None
    if sess.expires_at < utcnow():
        db.delete(sess)
        db.commit()
        return None

    sess.last_seen = utcnow()
    user = db.get(User, sess.user_id)
    db.commit()
    return user


def revoke_session(db: DbSession, *, token: str) -> None:
    token_hash = hash_token(token)
    sess = db.execute(
        select(UserSession).where(UserSession.token_hash == token_hash)
    ).scalar_one_or_none()
    if sess is not None:
        db.delete(sess)
        db.commit()
