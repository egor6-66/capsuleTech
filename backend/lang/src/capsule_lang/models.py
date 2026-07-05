"""ORM models — sense-centric lexical schema (ADR 064 §start-schema).

Atomic unit is `Sense` (a meaning), not `Word` (a surface string). Single-valued
facets live as columns on `senses` (pos/level/register/frequency); multi-valued
facets live as tags via the `sense_tags` M2M (ADR 064 D3). `sense_relations` is
DEFINED here but has no endpoints this iteration.
"""

from __future__ import annotations

from sqlalchemy import (
    JSON,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base
from .enums import (
    ConceptKind,
    Connotation,
    DrillDimension,
    Frequency,
    LessonLevel,
    Level,
    Pos,
    Register,
    RelationType,
    RuleCategory,
    Source,
    TagKind,
)


def _enum(enum_cls: type, name: str) -> SAEnum:
    """Portable string-valued enum column (no native ENUM type)."""
    return SAEnum(
        enum_cls,
        name=name,
        native_enum=False,
        validate_strings=True,
        values_callable=lambda e: [m.value for m in e],
    )


class Word(Base):
    __tablename__ = "words"
    __table_args__ = (UniqueConstraint("text", "lang", name="uq_words_text_lang"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(String, nullable=False)
    lang: Mapped[str] = mapped_column(String, nullable=False)

    senses: Mapped[list[Sense]] = relationship(
        back_populates="word", cascade="all, delete-orphan"
    )


class Tag(Base):
    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("name", "kind", name="uq_tags_name_kind"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[TagKind] = mapped_column(_enum(TagKind, "tag_kind"), nullable=False)


class SenseTag(Base):
    """M2M join — the filter/ranking axis (ADR 064 D2)."""

    __tablename__ = "sense_tags"
    __table_args__ = (Index("ix_sense_tags_tag_sense", "tag_id", "sense_id"),)

    sense_id: Mapped[int] = mapped_column(
        ForeignKey("senses.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )


class Sense(Base):
    __tablename__ = "senses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    word_id: Mapped[int] = mapped_column(
        ForeignKey("words.id", ondelete="CASCADE"), nullable=False, index=True
    )
    gloss: Mapped[str | None] = mapped_column(String, nullable=True)
    # Russian headword translation (e.g. "плохой" for "bad") — distinct from
    # `gloss`, which is an English definition/disambiguator. Cross-lingual `q`
    # search matches this column, not gloss (ADR 064-A corpus keeps gloss
    # English; conflating the two left Cyrillic search with nothing to hit).
    ru: Mapped[str | None] = mapped_column(String, nullable=True)
    pos: Mapped[Pos] = mapped_column(_enum(Pos, "pos"), nullable=False)
    level: Mapped[Level | None] = mapped_column(_enum(Level, "level"), nullable=True)
    register: Mapped[Register | None] = mapped_column(
        _enum(Register, "register"), nullable=True
    )
    frequency: Mapped[Frequency | None] = mapped_column(
        _enum(Frequency, "frequency"), nullable=True
    )
    lang: Mapped[str] = mapped_column(String, nullable=False, index=True)
    source: Mapped[Source] = mapped_column(
        _enum(Source, "source"), nullable=False, default=Source.AUTO
    )

    # Rich lexical entry (ADR 064-A A2) — all nullable/optional.
    pron_ru: Mapped[str | None] = mapped_column(String, nullable=True)
    ipa: Mapped[str | None] = mapped_column(String, nullable=True)
    image: Mapped[str | None] = mapped_column(String, nullable=True)
    connotation: Mapped[Connotation | None] = mapped_column(
        _enum(Connotation, "connotation"), nullable=True
    )
    intensity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    synset: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    forms: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    collocations: Mapped[list | None] = mapped_column(JSON, nullable=True)
    nuance: Mapped[str | None] = mapped_column(String, nullable=True)
    valency: Mapped[str | None] = mapped_column(String, nullable=True)

    word: Mapped[Word] = relationship(back_populates="senses")
    tags: Mapped[list[Tag]] = relationship(secondary=SenseTag.__table__, lazy="selectin")
    examples: Mapped[list[SenseExample]] = relationship(
        back_populates="sense", cascade="all, delete-orphan", lazy="selectin"
    )


class SenseExample(Base):
    """First-class contextual example with its own phonetics (ADR 064-A A2)."""

    __tablename__ = "sense_examples"
    __table_args__ = (
        UniqueConstraint("sense_id", "text", name="uq_sense_examples_sense_text"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sense_id: Mapped[int] = mapped_column(
        ForeignKey("senses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(String, nullable=False)
    pron_ru: Mapped[str | None] = mapped_column(String, nullable=True)
    ru: Mapped[str | None] = mapped_column(String, nullable=True)
    ipa: Mapped[str | None] = mapped_column(String, nullable=True)

    sense: Mapped[Sense] = relationship(back_populates="examples")


class SenseRelation(Base):
    """Directed typed edges between senses (ADR 064 D4). DEFINED — no endpoints yet."""

    __tablename__ = "sense_relations"
    __table_args__ = (
        Index("ix_sense_relations_from", "from_sense_id"),
        Index("ix_sense_relations_to", "to_sense_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    from_sense_id: Mapped[int] = mapped_column(
        ForeignKey("senses.id", ondelete="CASCADE"), nullable=False
    )
    to_sense_id: Mapped[int] = mapped_column(
        ForeignKey("senses.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[RelationType] = mapped_column(
        _enum(RelationType, "relation_type"), nullable=False
    )
    # Образ-мост (ADR 069 D4) — image-metaphor bridging the two senses. No data
    # yet; the column readies the conveyor (teacher writes → image renders).
    bridge: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[Source] = mapped_column(
        _enum(Source, "source"), nullable=False, default=Source.AUTO
    )


# --- lessons content (ADR 069): concepts / rules / drills / lessons ----------
#
# A separate content domain living in the same DB as the lexical graph (ADR 069
# D1): drills join the dictionary through `drill_words` (lemma → word). Ids are
# kebab strings = the vault filename stem (rule №0: filename == id forever), so
# cross-entity references are authored by that id and resolved at import time.
# `tags` are a plain string[] facet (JSON) — not the sense `Tag` axis.


class Concept(Base):
    """Philosophy/mindset prose — `lessons/concepts/*.md` (ADR 069)."""

    __tablename__ = "concepts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    principle: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    examples: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Accordion-IA grouping facet (ADR 069). `kind` = which group; `sort_order`
    # = position within it. Ru labels / group order are a front concern.
    kind: Mapped[ConceptKind] = mapped_column(
        _enum(ConceptKind, "concept_kind"),
        nullable=False,
        default=ConceptKind.APPROACH,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    source: Mapped[Source] = mapped_column(
        _enum(Source, "source"), nullable=False, default=Source.CURATED
    )

    related_rules: Mapped[list[Rule]] = relationship(
        secondary="concept_related_rules",
        order_by="ConceptRelatedRule.position",
        lazy="selectin",
    )
    related_concepts: Mapped[list[Concept]] = relationship(
        secondary="concept_related_concepts",
        primaryjoin="Concept.id == ConceptRelatedConcept.concept_id",
        secondaryjoin="Concept.id == ConceptRelatedConcept.related_id",
        order_by="ConceptRelatedConcept.position",
        lazy="selectin",
    )


class Rule(Base):
    """Reference rule (grammar/phonetics/speech) — body markdown as-is (ADR 069)."""

    __tablename__ = "rules"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Accordion-IA grouping facet (ADR 069). `category` = which group (defaults
    # from the vault folder); `sort_order` = position within it.
    category: Mapped[RuleCategory] = mapped_column(
        _enum(RuleCategory, "rule_category"),
        nullable=False,
        default=RuleCategory.GRAMMAR,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    source: Mapped[Source] = mapped_column(
        _enum(Source, "source"), nullable=False, default=Source.CURATED
    )


class Drill(Base):
    """A set of practice items for ONE mistake-class (`graboTag`) — `drills/*.md`."""

    __tablename__ = "drills"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    level: Mapped[LessonLevel] = mapped_column(
        _enum(LessonLevel, "lesson_level"), nullable=False
    )
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # The axis this drill measures (ADR 069, round-3): gates the prompt time-marker
    # check in the importer. `tense` (default) = strict; `other` = marker optional.
    dimension: Mapped[DrillDimension] = mapped_column(
        _enum(DrillDimension, "drill_dimension"),
        nullable=False,
        default=DrillDimension.TENSE,
    )
    rule_id: Mapped[str] = mapped_column(
        ForeignKey("rules.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    grabo_tag: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[Source] = mapped_column(
        _enum(Source, "source"), nullable=False, default=Source.CURATED
    )

    rule: Mapped[Rule] = relationship(lazy="selectin")
    items: Mapped[list[DrillItem]] = relationship(
        back_populates="drill",
        cascade="all, delete-orphan",
        order_by="DrillItem.position",
        lazy="selectin",
    )
    concepts: Mapped[list[Concept]] = relationship(
        secondary="drill_concepts",
        order_by="DrillConcept.position",
        lazy="selectin",
    )
    words: Mapped[list[Word]] = relationship(
        secondary="drill_words",
        order_by="DrillWord.position",
        lazy="selectin",
    )


class DrillItem(Base):
    """One RU→EN task inside a drill (ADR 069 D2). `accept`/`near_miss` are JSON."""

    __tablename__ = "drill_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    drill_id: Mapped[str] = mapped_column(
        ForeignKey("drills.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    prompt_ru: Mapped[str] = mapped_column(String, nullable=False)
    context: Mapped[str | None] = mapped_column(String, nullable=True)
    answer_en: Mapped[str] = mapped_column(String, nullable=False)
    accept: Mapped[list | None] = mapped_column(JSON, nullable=True)
    near_miss: Mapped[list | None] = mapped_column(JSON, nullable=True)
    grabo_tag: Mapped[str | None] = mapped_column(String, nullable=True)

    drill: Mapped[Drill] = relationship(back_populates="items")


class Lesson(Base):
    """Ordered route stitching concepts → rules → drills by reference (ADR 069)."""

    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    level: Mapped[LessonLevel] = mapped_column(
        _enum(LessonLevel, "lesson_level"), nullable=False
    )
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    intro: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[Source] = mapped_column(
        _enum(Source, "source"), nullable=False, default=Source.CURATED
    )

    concepts: Mapped[list[Concept]] = relationship(
        secondary="lesson_concepts",
        order_by="LessonConcept.position",
        lazy="selectin",
    )
    rules: Mapped[list[Rule]] = relationship(
        secondary="lesson_rules",
        order_by="LessonRule.position",
        lazy="selectin",
    )
    drills: Mapped[list[Drill]] = relationship(
        secondary="lesson_drills",
        order_by="LessonDrill.position",
        lazy="selectin",
    )


# --- ordered link tables (position = author's route order) -------------------


class LessonConcept(Base):
    __tablename__ = "lesson_concepts"

    lesson_id: Mapped[str] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"), primary_key=True
    )
    concept_id: Mapped[str] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)


class LessonRule(Base):
    __tablename__ = "lesson_rules"

    lesson_id: Mapped[str] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"), primary_key=True
    )
    rule_id: Mapped[str] = mapped_column(
        ForeignKey("rules.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)


class LessonDrill(Base):
    __tablename__ = "lesson_drills"

    lesson_id: Mapped[str] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"), primary_key=True
    )
    drill_id: Mapped[str] = mapped_column(
        ForeignKey("drills.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)


class DrillConcept(Base):
    __tablename__ = "drill_concepts"

    drill_id: Mapped[str] = mapped_column(
        ForeignKey("drills.id", ondelete="CASCADE"), primary_key=True
    )
    concept_id: Mapped[str] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)


class DrillWord(Base):
    """Drill → dictionary word (ADR 069 D1 join). Resolved lemma → word.id."""

    __tablename__ = "drill_words"

    drill_id: Mapped[str] = mapped_column(
        ForeignKey("drills.id", ondelete="CASCADE"), primary_key=True
    )
    word_id: Mapped[int] = mapped_column(
        ForeignKey("words.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)


class ConceptRelatedRule(Base):
    __tablename__ = "concept_related_rules"

    concept_id: Mapped[str] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), primary_key=True
    )
    rule_id: Mapped[str] = mapped_column(
        ForeignKey("rules.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)


class ConceptRelatedConcept(Base):
    __tablename__ = "concept_related_concepts"

    concept_id: Mapped[str] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), primary_key=True
    )
    related_id: Mapped[str] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
