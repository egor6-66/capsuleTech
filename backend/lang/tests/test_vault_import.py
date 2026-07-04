"""Full vault import — words (senses) then lessons, one command.

The point of the combined pass: the drill's `words[]` resolve against the
dictionary that the words phase just populated — no manual seeding needed.
"""

from __future__ import annotations

from pathlib import Path

from sqlalchemy import func, select

from capsule_lang.models import Drill, DrillWord, Lesson, Rule, Sense, Word
from capsule_lang.vault_import import import_full, import_words

FIXTURE_VAULT = Path(__file__).parent / "fixtures" / "vault"
WORD_LEMMAS = ["eat", "call", "leave", "come", "already"]


def _count(db, model) -> int:
    return db.scalar(select(func.count()).select_from(model))


def test_words_phase_populates_dictionary(blank_db):
    reports = import_words(FIXTURE_VAULT, blank_db)
    assert sum(r.imported for r in reports) == len(WORD_LEMMAS)
    assert sum(r.skipped for r in reports) == 0
    assert _count(blank_db, Sense) == len(WORD_LEMMAS)
    assert {w.text for w in blank_db.execute(select(Word)).scalars()} == set(WORD_LEMMAS)


def test_full_import_resolves_drill_words_without_seeding(blank_db):
    # No _seed_words: the words pass must run first and feed the lessons pass.
    report = import_full(FIXTURE_VAULT, blank_db)

    assert report.words_imported == len(WORD_LEMMAS)
    assert report.words_skipped == 0
    assert report.lessons.imported == 4  # rule, concept, drill, lesson
    assert report.lessons.rejected == []

    assert _count(blank_db, Rule) == 1
    assert _count(blank_db, Drill) == 1
    assert _count(blank_db, Lesson) == 1
    # all 5 drill words resolved against the freshly-imported dictionary
    assert _count(blank_db, DrillWord) == len(WORD_LEMMAS)
    drill = blank_db.get(Drill, "past-perfect-which-clause")
    assert [w.text for w in drill.words] == WORD_LEMMAS  # order preserved


def test_full_import_is_idempotent(blank_db):
    models = (Sense, Word, Rule, Drill, Lesson, DrillWord)
    import_full(FIXTURE_VAULT, blank_db)
    counts = {m.__name__: _count(blank_db, m) for m in models}

    r2 = import_full(FIXTURE_VAULT, blank_db)
    assert r2.words_imported == 0
    assert r2.words_updated == len(WORD_LEMMAS)
    assert r2.lessons.imported == 0
    assert r2.lessons.updated == 4
    after = {m.__name__: _count(blank_db, m) for m in models}
    assert after == counts
