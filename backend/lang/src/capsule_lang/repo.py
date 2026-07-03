"""Lexical queries — facet+tag filter, sense detail, related-by-shared-tags.

The tag axis (`sense_tags`) drives filtering and tag-overlap ranking; `synset`
(a sense column) drives the synonym grouping. Related is synset-aware (ADR
064-A A4): same-synset senses rank first, then tag overlap.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .enums import Connotation, Level, Pos, Register, RelationType, TagKind
from .models import Sense, SenseRelation, SenseTag, Tag, Word


def filter_senses(
    db: Session,
    *,
    lang: str,
    pos: Pos | None = None,
    level: Level | None = None,
    register: Register | None = None,
    connotation: Connotation | None = None,
    synset: str | None = None,
    domain: str | None = None,
    tier: str | None = None,
    tags: list[str] | None = None,
    q: str | None = None,
) -> list[Sense]:
    """Facet columns -> WHERE; tag/domain/tier -> JOIN sense_tags (AND across tags)."""
    stmt = select(Sense).join(Word, Sense.word_id == Word.id).where(Sense.lang == lang)

    if pos is not None:
        stmt = stmt.where(Sense.pos == pos)
    if level is not None:
        stmt = stmt.where(Sense.level == level)
    if register is not None:
        stmt = stmt.where(Sense.register == register)
    if connotation is not None:
        stmt = stmt.where(Sense.connotation == connotation)
    if synset is not None:
        stmt = stmt.where(Sense.synset == synset)
    if q:
        # Search by spelling only (word.text). Matching gloss too surprises
        # users (e.g. q=ase hitting "pleased"); gloss-search is a future opt-in.
        stmt = stmt.where(Word.text.ilike(f"%{q}%"))

    # Each required tag must be present -> one EXISTS subquery per tag (AND).
    required: list[tuple[str, TagKind | None]] = []
    if domain:
        required.append((domain, TagKind.DOMAIN))
    if tier:
        required.append((tier, TagKind.TIER))
    for name in tags or []:
        required.append((name, None))

    for name, kind in required:
        cond = (Tag.name == name) if kind is None else (
            (Tag.name == name) & (Tag.kind == kind)
        )
        sub = (
            select(SenseTag.sense_id)
            .join(Tag, SenseTag.tag_id == Tag.id)
            .where(SenseTag.sense_id == Sense.id, cond)
        )
        stmt = stmt.where(sub.exists())

    stmt = stmt.order_by(Sense.id)
    return list(db.execute(stmt).scalars().unique().all())


def get_sense(db: Session, sense_id: int) -> Sense | None:
    return db.get(Sense, sense_id)


def outgoing_relations(
    db: Session, sense_id: int
) -> list[tuple[RelationType, Sense]]:
    """Resolved outgoing edges (from this sense) with their target sense."""
    rows = db.execute(
        select(SenseRelation.type, Sense)
        .join(Sense, Sense.id == SenseRelation.to_sense_id)
        .where(SenseRelation.from_sense_id == sense_id)
        .order_by(SenseRelation.id)
    ).all()
    return [(rtype, target) for rtype, target in rows]


def related_senses(
    db: Session,
    *,
    sense_id: int,
    context: str | None = None,
    limit: int = 20,
) -> list[tuple[Sense, int, bool]]:
    """Senses related to `sense_id`, ranked same-synset first then shared tags.

    Candidate = shares >=1 tag OR shares the synset (same language, excluding
    self). When `context` (a tag name) is given, senses carrying it weigh above
    equal-rank peers. Returns (sense, shared_count, same_synset) best-first.
    """
    target = db.get(Sense, sense_id)
    if target is None:
        return []

    target_tag_ids = select(SenseTag.tag_id).where(SenseTag.sense_id == sense_id)
    shared_stmt = (
        select(SenseTag.sense_id, func.count(SenseTag.tag_id).label("shared"))
        .join(Sense, Sense.id == SenseTag.sense_id)
        .where(
            SenseTag.tag_id.in_(target_tag_ids),
            SenseTag.sense_id != sense_id,
            Sense.lang == target.lang,
        )
        .group_by(SenseTag.sense_id)
    )
    counts: dict[int, int] = dict(db.execute(shared_stmt).all())

    synset_ids: set[int] = set()
    if target.synset:
        synset_ids = set(
            db.execute(
                select(Sense.id).where(
                    Sense.synset == target.synset,
                    Sense.lang == target.lang,
                    Sense.id != sense_id,
                )
            ).scalars()
        )

    candidate_ids = set(counts) | synset_ids
    if not candidate_ids:
        return []

    senses = (
        db.execute(select(Sense).where(Sense.id.in_(candidate_ids))).scalars().all()
    )

    def has_context(s: Sense) -> bool:
        return context is not None and any(t.name == context for t in s.tags)

    def sort_key(s: Sense) -> tuple:
        return (s.id in synset_ids, has_context(s), counts.get(s.id, 0), -s.id)

    ranked = sorted(senses, key=sort_key, reverse=True)
    return [(s, counts.get(s.id, 0), s.id in synset_ids) for s in ranked[:limit]]
