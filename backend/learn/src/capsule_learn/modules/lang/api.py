"""lang router — /learn/lang/* (brief §Endpoints)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...config import settings
from ...db import get_db
from ...enums import Level, Pos, Register
from ...models import Sense
from ...schemas import (
    RelatedItem,
    RelatedResponse,
    SenseDetail,
    SenseListItem,
    SensesResponse,
    TagOut,
    WordOut,
)
from . import repo

router = APIRouter(prefix="/learn/lang", tags=["lang"])

DbDep = Annotated[Session, Depends(get_db)]


def _tags_out(sense: Sense) -> list[TagOut]:
    return [TagOut(name=t.name, kind=t.kind) for t in sense.tags]


@router.get("/senses", response_model=SensesResponse)
def list_senses(
    db: DbDep,
    lang: str = settings.default_lang,
    pos: Pos | None = None,
    level: Level | None = None,
    register: Register | None = None,
    domain: str | None = None,
    tag: Annotated[list[str] | None, Query()] = None,
    q: str | None = None,
) -> SensesResponse:
    senses = repo.filter_senses(
        db,
        lang=lang,
        pos=pos,
        level=level,
        register=register,
        domain=domain,
        tags=tag,
        q=q,
    )
    return SensesResponse(
        senses=[
            SenseListItem(
                id=s.id,
                text=s.word.text,
                gloss=s.gloss,
                pos=s.pos,
                level=s.level,
                register=s.register,
                frequency=s.frequency,
                tags=_tags_out(s),
            )
            for s in senses
        ]
    )


@router.get("/sense/{sense_id}", response_model=SenseDetail)
def get_sense(sense_id: int, db: DbDep) -> SenseDetail:
    s = repo.get_sense(db, sense_id)
    if s is None:
        raise HTTPException(status_code=404, detail="sense not found")
    return SenseDetail(
        id=s.id,
        word=WordOut(text=s.word.text, lang=s.word.lang),
        gloss=s.gloss,
        pos=s.pos,
        level=s.level,
        register=s.register,
        frequency=s.frequency,
        source=s.source,
        tags=_tags_out(s),
    )


@router.get("/senses/related", response_model=RelatedResponse)
def related(
    db: DbDep,
    sense: Annotated[int, Query(description="source sense id")],
    context: Annotated[str | None, Query(description="tag name to weight first")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> RelatedResponse:
    pairs = repo.related_senses(db, sense_id=sense, context=context, limit=limit)
    return RelatedResponse(
        related=[
            RelatedItem(
                id=s.id,
                text=s.word.text,
                gloss=s.gloss,
                sharedTags=shared,
                tags=_tags_out(s),
            )
            for s, shared in pairs
        ]
    )
