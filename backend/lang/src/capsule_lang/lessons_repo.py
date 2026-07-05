"""Read-only queries for lessons content (ADR 069 phase 1).

Ordering of a lesson's concepts/rules/drills and a drill's items/words comes
from the relationship `order_by=position` (models.py) — the author's route order
is preserved end-to-end.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Concept, Drill, Lesson, Rule


def list_lessons(db: Session) -> list[Lesson]:
    stmt = select(Lesson).order_by(Lesson.level, Lesson.title)
    return list(db.execute(stmt).scalars().all())


def list_concepts(db: Session) -> list[Concept]:
    # Accordion-IA order: group (kind) → within-group position → title (ADR 069).
    stmt = select(Concept).order_by(Concept.kind, Concept.sort_order, Concept.title)
    return list(db.execute(stmt).scalars().all())


def list_rules(db: Session) -> list[Rule]:
    # Accordion-IA order: group (category) → within-group position → title.
    stmt = select(Rule).order_by(Rule.category, Rule.sort_order, Rule.title)
    return list(db.execute(stmt).scalars().all())


def get_rule(db: Session, rule_id: str) -> Rule | None:
    return db.get(Rule, rule_id)


def list_drills_by_rule(db: Session, rule_id: str) -> list[Drill]:
    stmt = (
        select(Drill)
        .where(Drill.rule_id == rule_id)
        .order_by(Drill.level, Drill.title)
    )
    return list(db.execute(stmt).scalars().all())


def get_lesson(db: Session, lesson_id: str) -> Lesson | None:
    return db.get(Lesson, lesson_id)


def get_drill(db: Session, drill_id: str) -> Drill | None:
    return db.get(Drill, drill_id)


def get_concept(db: Session, concept_id: str) -> Concept | None:
    return db.get(Concept, concept_id)
