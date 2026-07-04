"""Lessons read-only API — list, composition ordering, drill items, 404s."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from capsule_lang.db import Base, get_db
from capsule_lang.lessons_importer import import_vault
from capsule_lang.main import app
from capsule_lang.models import Word

FIXTURE_VAULT = Path(__file__).parent / "fixtures" / "vault"
DRILL_WORDS = ["eat", "call", "leave", "come", "already"]


@pytest.fixture()
def lessons_client() -> TestClient:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with factory() as db:
        for w in DRILL_WORDS:
            db.add(Word(text=w, lang="en_US"))
        db.commit()
        import_vault(FIXTURE_VAULT, db)

    def _override():
        with factory() as s:
            yield s

    app.dependency_overrides[get_db] = _override
    yield TestClient(app)
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)


def test_list_lessons(lessons_client):
    r = lessons_client.get("/lang/lessons")
    assert r.status_code == 200
    lessons = r.json()["lessons"]
    assert lessons == [
        {"id": "past-perfect", "title": "Past Perfect: пред-прошлое", "level": "l3",
         "tags": ["grammar", "past-perfect"]}
    ]


def test_lesson_composition_preserves_order(lessons_client):
    r = lessons_client.get("/lang/lessons/past-perfect")
    assert r.status_code == 200
    body = r.json()
    assert body["intro"].startswith("Проза")
    assert [c["id"] for c in body["concepts"]] == ["word-as-image"]
    assert [rl["id"] for rl in body["rules"]] == ["grammar-verbs-tenses"]
    assert [d["id"] for d in body["drills"]] == ["past-perfect-which-clause"]

    # full drill embedded with both items in order
    drill = body["drills"][0]
    assert drill["rule"] == "grammar-verbs-tenses"
    assert drill["words"] == DRILL_WORDS
    assert [it["promptRu"] for it in drill["items"]] == [
        "Я уже поел, когда он позвонил.",
        "Он ушёл, когда я пришёл.",
    ]
    # nearMiss carried through with both match modes
    modes = {nm["match"] for it in drill["items"] for nm in it["nearMiss"]}
    assert modes == {"contains", "regex"}
    # concept composition carries prose + examples
    assert body["concepts"][0]["principle"].startswith("Учи слово")
    assert body["concepts"][0]["relatedRules"] == ["grammar-verbs-tenses"]


def test_drill_direct(lessons_client):
    r = lessons_client.get("/lang/drills/past-perfect-which-clause")
    assert r.status_code == 200
    assert len(r.json()["items"]) == 2


def test_concept_direct(lessons_client):
    r = lessons_client.get("/lang/concepts/word-as-image")
    assert r.status_code == 200
    assert r.json()["title"].startswith("Слово")


def test_404s(lessons_client):
    assert lessons_client.get("/lang/lessons/nope").status_code == 404
    assert lessons_client.get("/lang/drills/nope").status_code == 404
    assert lessons_client.get("/lang/concepts/nope").status_code == 404
