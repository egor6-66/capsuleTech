"""Idempotent seed — a few curated senses to exercise filter + related ranking.

Upsert by natural key (words by text+lang, tags by name+kind, senses by
word_id+gloss). Re-run does not create duplicates. source=curated → a future
auto re-seed (ADR 064 D5) will not overwrite these.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal, engine
from .enums import Level, Pos, Register, Source, TagKind
from .models import Base, Sense, SenseTag, Tag, Word

LANG = settings.default_lang


def _word(db: Session, text: str) -> Word:
    w = db.scalar(select(Word).where(Word.text == text, Word.lang == LANG))
    if w is None:
        w = Word(text=text, lang=LANG)
        db.add(w)
        db.flush()
    return w


def _tag(db: Session, name: str, kind: TagKind) -> Tag:
    t = db.scalar(select(Tag).where(Tag.name == name, Tag.kind == kind))
    if t is None:
        t = Tag(name=name, kind=kind)
        db.add(t)
        db.flush()
    return t


def _sense(
    db: Session,
    *,
    word: Word,
    gloss: str,
    pos: Pos,
    level: Level | None = None,
    register: Register | None = None,
    frequency: int | None = None,
    tags: list[Tag],
) -> Sense:
    s = db.scalar(
        select(Sense).where(Sense.word_id == word.id, Sense.gloss == gloss)
    )
    if s is None:
        s = Sense(word_id=word.id, gloss=gloss, lang=LANG)
        db.add(s)
    # Set every column before flush (pos is NOT NULL) — also keeps facets in
    # sync on re-seed.
    s.pos = pos
    s.level = level
    s.register = register
    s.frequency = frequency
    s.source = Source.CURATED
    db.flush()

    existing = {
        st.tag_id
        for st in db.scalars(select(SenseTag).where(SenseTag.sense_id == s.id)).all()
    }
    for t in tags:
        if t.id not in existing:
            db.add(SenseTag(sense_id=s.id, tag_id=t.id))
    return s


def seed(db: Session) -> None:
    # --- tags ---
    nature = _tag(db, "nature", TagKind.DOMAIN)
    geography = _tag(db, "geography", TagKind.SEMANTIC)
    finance = _tag(db, "finance", TagKind.DOMAIN)
    institution = _tag(db, "institution", TagKind.SEMANTIC)
    glad_synset = _tag(db, "synset-glad", TagKind.SEMANTIC)
    emotion = _tag(db, "emotion", TagKind.CONTEXT)

    # --- bank (polysemy: river bank / financial institution) ---
    bank = _word(db, "bank")
    _sense(
        db,
        word=bank,
        gloss="land beside a river",
        pos=Pos.NOUN,
        level=Level.B1,
        register=Register.NEUTRAL,
        frequency=800,
        tags=[nature, geography],
    )
    _sense(
        db,
        word=bank,
        gloss="financial institution",
        pos=Pos.NOUN,
        level=Level.A2,
        register=Register.NEUTRAL,
        frequency=1200,
        tags=[finance, institution],
    )

    # --- happy / glad / joyful (shared synset → related ranking) ---
    happy = _word(db, "happy")
    _sense(
        db,
        word=happy,
        gloss="feeling pleasure",
        pos=Pos.ADJ,
        level=Level.A1,
        register=Register.NEUTRAL,
        frequency=2000,
        tags=[glad_synset, emotion],
    )
    glad = _word(db, "glad")
    _sense(
        db,
        word=glad,
        gloss="pleased about something",
        pos=Pos.ADJ,
        level=Level.A2,
        register=Register.NEUTRAL,
        frequency=900,
        tags=[glad_synset, emotion],
    )
    joyful = _word(db, "joyful")
    _sense(
        db,
        word=joyful,
        gloss="full of joy",
        pos=Pos.ADJ,
        level=Level.B1,
        register=Register.NEUTRAL,
        frequency=300,
        tags=[glad_synset, emotion],
    )

    db.commit()


def main() -> None:
    # Convenience for `python -m capsule_learn.seed` without Alembic (dev only).
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    print("seed: done")


if __name__ == "__main__":
    main()
