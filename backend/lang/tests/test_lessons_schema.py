"""Lessons schema smoke — tables register on Base.metadata and a row roundtrips."""

from __future__ import annotations

from sqlalchemy import select

from capsule_lang.db import Base
from capsule_lang.models import Drill, DrillItem, Lesson, Rule


def test_lessons_tables_registered():
    names = set(Base.metadata.tables)
    assert {
        "concepts",
        "rules",
        "drills",
        "drill_items",
        "lessons",
        "lesson_concepts",
        "lesson_rules",
        "lesson_drills",
        "drill_concepts",
        "drill_words",
        "concept_related_rules",
        "concept_related_concepts",
    } <= names


def test_drill_roundtrip(blank_db):
    blank_db.add(Rule(id="grammar-x", title="X", body="body"))
    blank_db.flush()
    blank_db.add(Drill(id="d1", title="D", level="l3", rule_id="grammar-x", grabo_tag="g"))
    blank_db.flush()
    blank_db.add(DrillItem(drill_id="d1", position=0, prompt_ru="уже поел", answer_en="ate"))
    blank_db.add(Lesson(id="l1", title="L", level="l3", drills=[]))
    blank_db.commit()

    d = blank_db.get(Drill, "d1")
    assert d.rule.id == "grammar-x"
    assert [i.position for i in d.items] == [0]
    assert blank_db.scalar(select(Lesson.id)) == "l1"
