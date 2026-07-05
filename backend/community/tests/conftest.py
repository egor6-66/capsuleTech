"""Test fixtures — in-memory SQLite + overridable auth session (ADR 071).

`make_client(user)` wires an in-memory DB and a fake session: pass an AuthUser
for a member, or None for a guest. The real auth-passthrough client (which does
HTTP to backend/auth) is never touched — `optional_user` is dependency-overridden.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from capsule_community.clients.auth import AuthUser, optional_user
from capsule_community.db import Base, get_db
from capsule_community.main import app
from capsule_community.models import Event, Profile  # noqa: F401  (register tables)


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    yield factory
    Base.metadata.drop_all(engine)


@pytest.fixture()
def db(session_factory) -> Session:
    with session_factory() as s:
        yield s


@pytest.fixture()
def make_client(session_factory):
    def _db_override():
        with session_factory() as s:
            yield s

    def _make(user: AuthUser | None = None) -> TestClient:
        app.dependency_overrides[get_db] = _db_override
        app.dependency_overrides[optional_user] = lambda: user
        return TestClient(app)

    yield _make
    app.dependency_overrides.clear()


@pytest.fixture()
def client(make_client) -> TestClient:
    """Guest client (no session) sharing the same in-memory DB."""
    return make_client(None)
