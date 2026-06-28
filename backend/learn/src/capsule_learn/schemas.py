"""Pydantic response models — Postman contract (brief §Endpoints)."""

from pydantic import BaseModel

from .enums import Level, Pos, Register, Source, TagKind


class TagOut(BaseModel):
    name: str
    kind: TagKind


class SenseListItem(BaseModel):
    id: int
    text: str
    gloss: str | None
    pos: Pos
    level: Level | None
    register: Register | None
    frequency: int | None
    tags: list[TagOut]


class SensesResponse(BaseModel):
    senses: list[SenseListItem]


class WordOut(BaseModel):
    text: str
    lang: str


class SenseDetail(BaseModel):
    id: int
    word: WordOut
    gloss: str | None
    pos: Pos
    level: Level | None
    register: Register | None
    frequency: int | None
    source: Source
    tags: list[TagOut]


class RelatedItem(BaseModel):
    id: int
    text: str
    gloss: str | None
    sharedTags: int
    tags: list[TagOut]


class RelatedResponse(BaseModel):
    related: list[RelatedItem]
