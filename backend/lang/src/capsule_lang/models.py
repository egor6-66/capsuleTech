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
    Connotation,
    Frequency,
    Level,
    Pos,
    Register,
    RelationType,
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
    source: Mapped[Source] = mapped_column(
        _enum(Source, "source"), nullable=False, default=Source.AUTO
    )
