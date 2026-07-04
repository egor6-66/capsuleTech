"""Pydantic models for lessons content (ADR 069).

Two halves: ingestion canon (`*In`, parsed from vault frontmatter — camelCase
keys via alias) and the read-only response contract (`*Out` — camelCase fields
matching `lessons-model-final.md`). Cross-field validation with human reasons
lives in `lessons_importer`, not here; these models just shape + coerce.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .enums import LessonLevel, MatchMode

_camel = ConfigDict(populate_by_name=True)


def _lower(v: object) -> object:
    # Teachers write levels as `L3`; enum values are lowercase `l3`.
    return v.strip().lower() if isinstance(v, str) else v


# --- ingestion canon (parsed from frontmatter) ------------------------------


class ExampleIn(BaseModel):
    en: str
    ru: str
    image: str | None = None


class NearMissIn(BaseModel):
    match: MatchMode = MatchMode.CONTAINS
    pattern: str
    hint: str

    @field_validator("match", mode="before")
    @classmethod
    def _norm(cls, v: object) -> object:
        return _lower(v)


class DrillItemIn(BaseModel):
    model_config = _camel

    prompt_ru: str = Field(alias="promptRu")
    context: str | None = None
    answer_en: str = Field(alias="answerEn")
    accept: list[str] = Field(default_factory=list)
    near_miss: list[NearMissIn] = Field(default_factory=list, alias="nearMiss")
    grabo_tag: str | None = Field(default=None, alias="graboTag")


class ConceptIn(BaseModel):
    model_config = _camel

    id: str
    title: str
    principle: str
    body: str  # markdown content (injected by importer, not frontmatter)
    tags: list[str] = Field(default_factory=list)
    examples: list[ExampleIn] = Field(default_factory=list)
    related_rules: list[str] = Field(default_factory=list, alias="relatedRules")
    related_concepts: list[str] = Field(default_factory=list, alias="relatedConcepts")


class RuleIn(BaseModel):
    id: str
    title: str
    body: str  # markdown content (injected by importer)
    tags: list[str] = Field(default_factory=list)


class DrillIn(BaseModel):
    model_config = _camel

    id: str
    title: str
    level: LessonLevel
    tags: list[str] = Field(default_factory=list)
    rule: str
    concept: list[str] = Field(default_factory=list)
    grabo_tag: str = Field(alias="graboTag")
    words: list[str] = Field(default_factory=list)
    items: list[DrillItemIn]

    @field_validator("level", mode="before")
    @classmethod
    def _norm(cls, v: object) -> object:
        return _lower(v)


class LessonIn(BaseModel):
    id: str
    title: str
    level: LessonLevel
    tags: list[str] = Field(default_factory=list)
    intro: str | None = None
    concepts: list[str] = Field(default_factory=list)
    rules: list[str] = Field(default_factory=list)
    drills: list[str] = Field(default_factory=list)

    @field_validator("level", mode="before")
    @classmethod
    def _norm(cls, v: object) -> object:
        return _lower(v)


# --- response contract (read-only, ADR 069 phase 1) -------------------------


class ExampleOut(BaseModel):
    en: str
    ru: str
    image: str | None = None


class NearMissOut(BaseModel):
    match: MatchMode
    pattern: str
    hint: str


class ConceptOut(BaseModel):
    id: str
    title: str
    principle: str
    body: str
    tags: list[str]
    examples: list[ExampleOut]
    relatedRules: list[str]
    relatedConcepts: list[str]


class RuleOut(BaseModel):
    id: str
    title: str
    body: str
    tags: list[str]


class DrillItemOut(BaseModel):
    promptRu: str
    context: str | None
    answerEn: str
    accept: list[str]
    nearMiss: list[NearMissOut]
    graboTag: str | None


class DrillOut(BaseModel):
    id: str
    title: str
    level: LessonLevel
    tags: list[str]
    rule: str
    graboTag: str
    words: list[str]
    concepts: list[str]
    items: list[DrillItemOut]


class LessonListItem(BaseModel):
    id: str
    title: str
    level: LessonLevel
    tags: list[str]


class LessonsResponse(BaseModel):
    lessons: list[LessonListItem]


class LessonDetail(BaseModel):
    id: str
    title: str
    level: LessonLevel
    tags: list[str]
    intro: str | None
    concepts: list[ConceptOut]
    rules: list[RuleOut]
    drills: list[DrillOut]
