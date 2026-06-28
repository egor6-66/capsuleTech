"""Lexical queries — facet+tag filter, sense detail, related-by-shared-tags.

The tag axis (`sense_tags`) drives both filtering and the contextual ranking
(ADR 064 D2): related = ORDER BY COUNT(shared tags) DESC.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...enums import Level, Pos, Register, TagKind
from ...models import Sense, SenseTag, Tag, Word


def filter_senses(
    db: Session,
    *,
    lang: str,
    pos: Pos | None = None,
    level: Level | None = None,
    register: Register | None = None,
    domain: str | None = None,
    tags: list[str] | None = None,
    q: str | None = None,
) -> list[Sense]:
    """Facet columns → WHERE; tag/domain → JOIN sense_tags (AND across tags)."""
    stmt = select(Sense).join(Word, Sense.word_id == Word.id).where(Sense.lang == lang)

    if pos is not None:
        stmt = stmt.where(Sense.pos == pos)
    if level is not None:
        stmt = stmt.where(Sense.level == level)
    if register is not None:
        stmt = stmt.where(Sense.register == register)
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Word.text.ilike(like)) | (Sense.gloss.ilike(like)))

    # Each required tag must be present → one EXISTS-style join per tag (AND).
    required: list[tuple[str, TagKind | None]] = []
    if domain:
        required.append((domain, TagKind.DOMAIN))
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


def related_senses(
    db: Session,
    *,
    sense_id: int,
    context: str | None = None,
    limit: int = 20,
) -> list[tuple[Sense, int]]:
    """Senses sharing >=1 tag with `sense_id`, ranked by shared-tag count.

    Same language, excluding the source sense. When `context` (a tag name) is
    given, senses carrying that tag rank first (secondary weight).
    Returns (sense, shared_count) sorted best-first.
    """
    target = db.get(Sense, sense_id)
    if target is None:
        return []

    target_tag_ids = select(SenseTag.tag_id).where(SenseTag.sense_id == sense_id)

    shared_col = func.count(SenseTag.tag_id).label("shared")
    stmt = (
        select(SenseTag.sense_id, shared_col)
        .join(Sense, Sense.id == SenseTag.sense_id)
        .where(
            SenseTag.tag_id.in_(target_tag_ids),
            SenseTag.sense_id != sense_id,
            Sense.lang == target.lang,
        )
        .group_by(SenseTag.sense_id)
    )
    counts: dict[int, int] = {sid: n for sid, n in db.execute(stmt).all()}
    if not counts:
        return []

    senses = (
        db.execute(select(Sense).where(Sense.id.in_(counts.keys()))).scalars().all()
    )

    def has_context(s: Sense) -> bool:
        return context is not None and any(t.name == context for t in s.tags)

    ranked = sorted(
        senses,
        key=lambda s: (has_context(s), counts[s.id], -s.id),
        reverse=True,
    )
    return [(s, counts[s.id]) for s in ranked[:limit]]
