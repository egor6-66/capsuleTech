"""lessons router — /lang/lessons, /lang/drills, /lang/concepts (ADR 069 phase 1).

Read-only composition. Nothing interactive (answer-checking = phase 2). Kept in
its own router/module so the sense contract (`api.py`) stays untouched.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from . import lessons_repo as repo
from .db import get_db
from .lessons_schemas import (
    ConceptListItem,
    ConceptOut,
    ConceptsResponse,
    DrillItemOut,
    DrillOut,
    DrillsResponse,
    LessonDetail,
    LessonListItem,
    LessonsResponse,
    NearMissOut,
    RuleListItem,
    RuleOut,
    RulesResponse,
)
from .models import Concept, Drill, DrillItem, Lesson, Rule

router = APIRouter(prefix="/lang", tags=["lessons"])

DbDep = Annotated[Session, Depends(get_db)]


def _concept_out(c: Concept) -> ConceptOut:
    return ConceptOut(
        id=c.id,
        title=c.title,
        principle=c.principle,
        body=c.body,
        tags=c.tags or [],
        examples=c.examples or [],
        relatedRules=[r.id for r in c.related_rules],
        relatedConcepts=[rc.id for rc in c.related_concepts],
    )


def _rule_out(r: Rule) -> RuleOut:
    return RuleOut(id=r.id, title=r.title, body=r.body, tags=r.tags or [])


def _item_out(i: DrillItem) -> DrillItemOut:
    return DrillItemOut(
        promptRu=i.prompt_ru,
        context=i.context,
        answerEn=i.answer_en,
        accept=i.accept or [],
        nearMiss=[NearMissOut(**nm) for nm in (i.near_miss or [])],
        graboTag=i.grabo_tag,
    )


def _drill_out(d: Drill) -> DrillOut:
    return DrillOut(
        id=d.id,
        title=d.title,
        level=d.level,
        dimension=d.dimension,
        tags=d.tags or [],
        rule=d.rule_id,
        graboTag=d.grabo_tag,
        words=[w.text for w in d.words],
        concepts=[c.id for c in d.concepts],
        items=[_item_out(i) for i in d.items],
    )


@router.get("/lessons", response_model=LessonsResponse)
def list_lessons(db: DbDep) -> LessonsResponse:
    return LessonsResponse(
        lessons=[
            LessonListItem(id=lo.id, title=lo.title, level=lo.level, tags=lo.tags or [])
            for lo in repo.list_lessons(db)
        ]
    )


@router.get("/lessons/{lesson_id}", response_model=LessonDetail)
def get_lesson(lesson_id: str, db: DbDep) -> LessonDetail:
    lo: Lesson | None = repo.get_lesson(db, lesson_id)
    if lo is None:
        raise HTTPException(status_code=404, detail="lesson not found")
    return LessonDetail(
        id=lo.id,
        title=lo.title,
        level=lo.level,
        tags=lo.tags or [],
        intro=lo.intro,
        concepts=[_concept_out(c) for c in lo.concepts],
        rules=[_rule_out(r) for r in lo.rules],
        drills=[_drill_out(d) for d in lo.drills],
    )


@router.get("/rules", response_model=RulesResponse)
def list_rules(db: DbDep) -> RulesResponse:
    return RulesResponse(
        rules=[
            RuleListItem(
                id=r.id,
                title=r.title,
                tags=r.tags or [],
                category=r.category,
                sortOrder=r.sort_order,
            )
            for r in repo.list_rules(db)
        ]
    )


@router.get("/rules/{rule_id}", response_model=RuleOut)
def get_rule(rule_id: str, db: DbDep) -> RuleOut:
    r = repo.get_rule(db, rule_id)
    if r is None:
        raise HTTPException(status_code=404, detail="rule not found")
    return _rule_out(r)


@router.get("/drills", response_model=DrillsResponse)
def list_drills(
    db: DbDep,
    rule: Annotated[str, Query(description="rule id — return that rule's drills")],
) -> DrillsResponse:
    return DrillsResponse(
        drills=[_drill_out(d) for d in repo.list_drills_by_rule(db, rule)]
    )


@router.get("/drills/{drill_id}", response_model=DrillOut)
def get_drill(drill_id: str, db: DbDep) -> DrillOut:
    d = repo.get_drill(db, drill_id)
    if d is None:
        raise HTTPException(status_code=404, detail="drill not found")
    return _drill_out(d)


@router.get("/concepts", response_model=ConceptsResponse)
def list_concepts(db: DbDep) -> ConceptsResponse:
    return ConceptsResponse(
        concepts=[
            ConceptListItem(
                id=c.id,
                title=c.title,
                principle=c.principle,
                tags=c.tags or [],
                kind=c.kind,
                sortOrder=c.sort_order,
            )
            for c in repo.list_concepts(db)
        ]
    )


@router.get("/concepts/{concept_id}", response_model=ConceptOut)
def get_concept(concept_id: str, db: DbDep) -> ConceptOut:
    c = repo.get_concept(db, concept_id)
    if c is None:
        raise HTTPException(status_code=404, detail="concept not found")
    return _concept_out(c)
