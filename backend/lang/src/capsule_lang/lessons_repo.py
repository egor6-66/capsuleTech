"""Read-only queries for lessons content (ADR 069 phase 1).

Ordering of a lesson's concepts/rules/drills and a drill's items/words comes
from the relationship `order_by=position` (models.py) — the author's route order
is preserved end-to-end.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Concept, Drill, Lesson


def list_lessons(db: Session) -> list[Lesson]:
    stmt = select(Lesson).order_by(Lesson.level, Lesson.title)
    return list(db.execute(stmt).scalars().all())


def get_lesson(db: Session, lesson_id: str) -> Lesson | None:
    return db.get(Lesson, lesson_id)


def get_drill(db: Session, drill_id: str) -> Drill | None:
    return db.get(Drill, drill_id)


def get_concept(db: Session, concept_id: str) -> Concept | None:
    return db.get(Concept, concept_id)
