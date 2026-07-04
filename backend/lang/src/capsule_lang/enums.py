"""Typed enums for the lexical schema (ADR 064 start-schema).

Stored as their string values (native_enum=False in models) for SQLite/Postgres
portability — a drop-in dialect switch must not depend on native ENUM types.
"""

from enum import StrEnum


class Pos(StrEnum):
    NOUN = "noun"
    VERB = "verb"
    ADJ = "adj"
    ADV = "adv"
    PRON = "pron"
    PREP = "prep"
    CONJ = "conj"
    DET = "det"
    INTERJ = "interj"


class Level(StrEnum):
    """CEFR. Sense-level facet, nullable (ADR 064 D3)."""

    A1 = "a1"
    A2 = "a2"
    B1 = "b1"
    B2 = "b2"
    C1 = "c1"
    C2 = "c2"


class Register(StrEnum):
    """Register axis — teacher corpus uses more than the original 3 (2026-06-29)."""

    FORMAL = "formal"
    INFORMAL = "informal"
    NEUTRAL = "neutral"
    COLLOQUIAL = "colloquial"
    SLANG = "slang"
    VULGAR = "vulgar"
    LITERARY = "literary"
    ARCHAIC = "archaic"
    DATED = "dated"
    TECHNICAL = "technical"


class Frequency(StrEnum):
    """Band facet (ADR 064-A A2). Numeric rank (wordfreq) is a later auto-column."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Connotation(StrEnum):
    """Synset discriminator (ADR 064-A A2) — colours a swap choice."""

    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class TagKind(StrEnum):
    """Orthogonal tag axis v2 (ADR 064-A A3). synset moved to a sense column."""

    FIELD = "field"
    DOMAIN = "domain"
    TIER = "tier"
    PHONETIC = "phonetic"
    LEXICAL = "lexical"


class RelationType(StrEnum):
    ANTONYM = "antonym"
    HYPERNYM = "hypernym"
    HYPONYM = "hyponym"
    PART_OF = "part_of"
    MEMBER_OF = "member_of"


class Source(StrEnum):
    """Provenance — re-seed updates only `auto` rows, never `curated` (ADR 064 D5)."""

    AUTO = "auto"
    CURATED = "curated"


class LessonLevel(StrEnum):
    """Pack-difficulty axis L0–L5 (ADR 069) — set by hand, distinct from the
    CEFR `Level` facet of a sense. Drills/lessons carry this, not `a1..c2`."""

    L0 = "l0"
    L1 = "l1"
    L2 = "l2"
    L3 = "l3"
    L4 = "l4"
    L5 = "l5"


class MatchMode(StrEnum):
    """How a `nearMiss` pattern matches a learner answer (ADR 069 D2).

    `contains` covers ~90% of typo-feedback; `regex` for the rare cases a plain
    substring can't express. Default is `contains`.
    """

    CONTAINS = "contains"
    REGEX = "regex"
