"""YAML importer — idempotency, validation, two-pass relation resolution."""

from __future__ import annotations

from sqlalchemy import func, select

from capsule_lang.importer import import_file
from capsule_lang.models import Sense, SenseExample, SenseRelation, Tag, Word
from seed_fixture import SEED_FILE


def _count(db, model) -> int:
    return db.scalar(select(func.count()).select_from(model))


def test_importer_idempotent(blank_db):
    r1 = import_file(SEED_FILE, db=blank_db)
    assert r1.imported == 6
    assert r1.updated == 0
    assert r1.skipped == 0
    counts = {
        "words": _count(blank_db, Word),
        "senses": _count(blank_db, Sense),
        "tags": _count(blank_db, Tag),
        "examples": _count(blank_db, SenseExample),
    }
    assert counts == {"words": 5, "senses": 6, "tags": 4, "examples": 3}

    r2 = import_file(SEED_FILE, db=blank_db)
    assert r2.imported == 0
    assert r2.updated == 6
    after = {
        "words": _count(blank_db, Word),
        "senses": _count(blank_db, Sense),
        "tags": _count(blank_db, Tag),
        "examples": _count(blank_db, SenseExample),
    }
    assert after == counts  # zero duplicates


def test_importer_validation(blank_db, tmp_path):
    p = tmp_path / "mixed.yml"
    p.write_text(
        "\n".join(
            [
                "- word: ok",
                "  pos: noun",
                "  gloss: a fine thing",
                "- word: broken",
                "  pos: notapos",
                "  gloss: invalid pos",
            ]
        ),
        encoding="utf-8",
    )
    report = import_file(p, db=blank_db)
    assert report.imported == 1
    assert report.skipped == 1
    assert report.errors[0].word == "broken"
    # the valid block still landed
    assert _count(blank_db, Word) == 1
    assert blank_db.scalar(select(Word.text)) == "ok"


def test_importer_normalizes_enum_case(blank_db, tmp_path):
    # CEFR is conventionally uppercase; enum values are lowercase.
    p = tmp_path / "case.yml"
    p.write_text(
        "\n".join(
            [
                "- word: Big",
                "  pos: ADJECTIVE",
                "  gloss: large",
                "  level: A1",
                "  register: Neutral",
                "  frequency: High",
                "  connotation: Positive",
            ]
        ),
        encoding="utf-8",
    )
    report = import_file(p, db=blank_db)
    assert report.imported == 1
    assert report.skipped == 0
    sense = blank_db.scalar(select(Sense))
    assert sense.level.value == "a1"
    assert sense.pos.value == "adj"
    assert sense.register.value == "neutral"
    assert sense.frequency.value == "high"
    assert sense.connotation.value == "positive"


def test_importer_relations(blank_db, tmp_path):
    # `up` references `down` defined LATER → two-pass must still resolve it.
    # `lonely` references an absent target → reported as unresolved, not fatal.
    p = tmp_path / "rel.yml"
    p.write_text(
        "\n".join(
            [
                "- word: up",
                "  pos: adjective",
                "  gloss: at a height",
                "  relations:",
                '    - {type: antonym, target: "down (low position)"}',
                "- word: down",
                "  pos: adjective",
                "  gloss: low position",
                "- word: lonely",
                "  pos: adjective",
                "  gloss: feeling alone",
                "  relations:",
                '    - {type: antonym, target: "crowded (full of people)"}',
            ]
        ),
        encoding="utf-8",
    )
    report = import_file(p, db=blank_db)
    assert report.imported == 3
    # antonym(up -> down) resolved into a concrete edge
    assert _count(blank_db, SenseRelation) == 1
    up = blank_db.scalar(select(Sense).join(Word).where(Word.text == "up"))
    down = blank_db.scalar(select(Sense).join(Word).where(Word.text == "down"))
    edge = blank_db.scalar(select(SenseRelation))
    assert (edge.from_sense_id, edge.to_sense_id) == (up.id, down.id)
    # crowded never existed → surfaced, not crashed
    assert any("crowded" in u for u in report.unresolved_relations)
