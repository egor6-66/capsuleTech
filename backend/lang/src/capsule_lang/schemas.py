"""Pydantic models — ingestion canon (ADR 064-A A4) + response contract."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from .enums import (
    Connotation,
    Frequency,
    Level,
    Pos,
    Register,
    RelationType,
    Source,
    TagKind,
)

# Long-form POS synonyms accepted from teacher YAML → canonical short form.
POS_SYNONYMS: dict[str, str] = {
    "adjective": "adj",
    "adverb": "adv",
    "noun": "noun",
    "verb": "verb",
    "pronoun": "pron",
    "preposition": "prep",
    "conjunction": "conj",
    "determiner": "det",
    "interjection": "interj",
}


# --- ingestion canon (ADR 064-A A4) -----------------------------------------


class ExampleIn(BaseModel):
    text: str
    pron_ru: str | None = None
    ru: str | None = None
    ipa: str | None = None


class TagIn(BaseModel):
    name: str
    kind: TagKind  # field|domain|tier|phonetic|lexical


class RelationIn(BaseModel):
    type: RelationType  # antonym|hypernym|hyponym|part_of|member_of
    target: str  # "word (gloss-disambiguator)" → resolved to a sense id


class SenseIn(BaseModel):
    word: str
    lang: str = "en_US"
    gloss: str | None = None
    ru: str | None = None
    pos: Pos
    level: Level | None = None
    # `register_` avoids shadowing BaseModel; JSON key stays "register".
    register_: Register | None = Field(default=None, alias="register")
    frequency: Frequency | None = None
    pron_ru: str | None = None
    ipa: str | None = None
    image: str | None = None
    connotation: Connotation | None = None
    intensity: int | None = None
    synset: str | None = None
    nuance: str | None = None
    valency: str | None = None
    forms: dict[str, str] = Field(default_factory=dict)
    traits: list[str] = Field(default_factory=list)  # → lexical tags
    tags: list[TagIn] = Field(default_factory=list)
    relations: list[RelationIn] = Field(default_factory=list)
    collocations: list[str] = Field(default_factory=list)
    examples: list[ExampleIn] = Field(default_factory=list)

    @field_validator("pos", mode="before")
    @classmethod
    def _normalize_pos(cls, v: object) -> object:
        if isinstance(v, str):
            return POS_SYNONYMS.get(v.strip().lower(), v.strip().lower())
        return v

    @field_validator("level", "register_", "frequency", "connotation", mode="before")
    @classmethod
    def _normalize_enum_case(cls, v: object) -> object:
        # Teachers write CEFR (A1) and may capitalise enum values — accept any
        # case; the canonical enum values are lowercase.
        return v.strip().lower() if isinstance(v, str) else v


# --- response contract ------------------------------------------------------


class TagOut(BaseModel):
    name: str
    kind: TagKind


class ExampleOut(BaseModel):
    text: str
    pron_ru: str | None = None
    ru: str | None = None
    ipa: str | None = None


class RelationOut(BaseModel):
    type: RelationType
    target: str  # "word" or "word (gloss)" of the resolved sense


class SenseListItem(BaseModel):
    id: int
    text: str
    gloss: str | None
    ru: str | None
    pos: Pos
    level: Level | None
    register_: Register | None = Field(alias="register")
    frequency: Frequency | None
    pron_ru: str | None
    connotation: Connotation | None
    synset: str | None
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
    ru: str | None
    pos: Pos
    level: Level | None
    register_: Register | None = Field(alias="register")
    frequency: Frequency | None
    source: Source
    pron_ru: str | None
    ipa: str | None
    image: str | None
    connotation: Connotation | None
    intensity: int | None
    synset: str | None
    nuance: str | None
    valency: str | None
    forms: dict[str, str]
    collocations: list[str]
    tags: list[TagOut]
    examples: list[ExampleOut]
    relations: list[RelationOut]


class RelatedItem(BaseModel):
    id: int
    text: str
    gloss: str | None
    sharedTags: int
    sameSynset: bool
    connotation: Connotation | None
    intensity: int | None
    synset: str | None
    tags: list[TagOut]


class RelatedResponse(BaseModel):
    related: list[RelatedItem]
