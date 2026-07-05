"""Test fixtures — in-memory SQLite, schema via create_all, seeded data."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from capsule_lang.db import Base, get_db
from capsule_lang.main import app
from capsule_lang.models import Base as ModelsBase  # noqa: F401  (ensure tables loaded)
from seed_fixture import seed


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with factory() as db:
        seed(db)
    yield factory
    Base.metadata.drop_all(engine)


@pytest.fixture()
def db(session_factory) -> Session:
    with session_factory() as s:
        yield s


@pytest.fixture()
def blank_db() -> Session:
    """Empty schema, no seed — for importer unit tests."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with factory() as s:
        yield s
    Base.metadata.drop_all(engine)


@pytest.fixture()
def client(session_factory) -> TestClient:
    def _override():
        with session_factory() as s:
            yield s

    app.dependency_overrides[get_db] = _override
    yield TestClient(app)
    app.dependency_overrides.clear()
