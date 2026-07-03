"""lang router — /lang/* (ADR 067 D2 public contract)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from . import repo
from .config import settings
from .db import get_db
from .enums import Connotation, Level, Pos, Register
from .models import Sense
from .schemas import (
    ExampleOut,
    RelatedItem,
    RelatedResponse,
    RelationOut,
    SenseDetail,
    SenseListItem,
    SensesResponse,
    TagOut,
    WordOut,
)

router = APIRouter(prefix="/lang", tags=["lang"])

DbDep = Annotated[Session, Depends(get_db)]


def _tags_out(sense: Sense) -> list[TagOut]:
    return [TagOut(name=t.name, kind=t.kind) for t in sense.tags]


def _examples_out(sense: Sense) -> list[ExampleOut]:
    return [
        ExampleOut(text=e.text, pron_ru=e.pron_ru, ru=e.ru, ipa=e.ipa)
        for e in sense.examples
    ]


def _target_label(sense: Sense) -> str:
    return f"{sense.word.text} ({sense.gloss})" if sense.gloss else sense.word.text


def _list_item(sense: Sense) -> SenseListItem:
    return SenseListItem(
        id=sense.id,
        text=sense.word.text,
        gloss=sense.gloss,
        ru=sense.ru,
        pos=sense.pos,
        level=sense.level,
        register=sense.register,
        frequency=sense.frequency,
        pron_ru=sense.pron_ru,
        connotation=sense.connotation,
        synset=sense.synset,
        tags=_tags_out(sense),
    )


@router.get("/senses", response_model=SensesResponse)
def list_senses(
    db: DbDep,
    lang: str = settings.default_lang,
    pos: Pos | None = None,
    level: Level | None = None,
    register: Register | None = None,
    connotation: Connotation | None = None,
    synset: str | None = None,
    domain: str | None = None,
    tier: str | None = None,
    tag: Annotated[list[str] | None, Query()] = None,
    q: str | None = None,
) -> SensesResponse:
    senses = repo.filter_senses(
        db,
        lang=lang,
        pos=pos,
        level=level,
        register=register,
        connotation=connotation,
        synset=synset,
        domain=domain,
        tier=tier,
        tags=tag,
        q=q,
    )
    return SensesResponse(senses=[_list_item(s) for s in senses])


@router.get("/sense/{sense_id}", response_model=SenseDetail)
def get_sense(sense_id: int, db: DbDep) -> SenseDetail:
    s = repo.get_sense(db, sense_id)
    if s is None:
        raise HTTPException(status_code=404, detail="sense not found")
    relations = [
        RelationOut(type=rtype, target=_target_label(target))
        for rtype, target in repo.outgoing_relations(db, s.id)
    ]
    return SenseDetail(
        id=s.id,
        word=WordOut(text=s.word.text, lang=s.word.lang),
        gloss=s.gloss,
        ru=s.ru,
        pos=s.pos,
        level=s.level,
        register=s.register,
        frequency=s.frequency,
        source=s.source,
        pron_ru=s.pron_ru,
        ipa=s.ipa,
        image=s.image,
        connotation=s.connotation,
        intensity=s.intensity,
        synset=s.synset,
        nuance=s.nuance,
        valency=s.valency,
        forms=s.forms or {},
        collocations=s.collocations or [],
        tags=_tags_out(s),
        examples=_examples_out(s),
        relations=relations,
    )


@router.get("/senses/related", response_model=RelatedResponse)
def related(
    db: DbDep,
    sense: Annotated[int, Query(description="source sense id")],
    context: Annotated[str | None, Query(description="tag name to weight first")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> RelatedResponse:
    triples = repo.related_senses(db, sense_id=sense, context=context, limit=limit)
    return RelatedResponse(
        related=[
            RelatedItem(
                id=s.id,
                text=s.word.text,
                gloss=s.gloss,
                sharedTags=shared,
                sameSynset=same_synset,
                connotation=s.connotation,
                intensity=s.intensity,
                synset=s.synset,
                tags=_tags_out(s),
            )
            for s, shared, same_synset in triples
        ]
    )
