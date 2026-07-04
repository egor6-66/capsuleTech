"""YAML lexical importer — the canonical ingestion path (ADR 064-A A4).

Adapter #1 (teacher YAML) -> internal `SenseIn` canon -> two-pass idempotent
upsert. Invalid blocks are collected into the report, never fatal: one broken
word must not block a hundred good ones. `source=curated`.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml
from pydantic import BaseModel, ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import SessionLocal
from .enums import Source, TagKind
from .models import Sense, SenseExample, SenseRelation, SenseTag, Tag, Word
from .schemas import ExampleIn, RelationIn, SenseIn

_TARGET_RE = re.compile(r"^\s*([^(]+?)\s*(?:\(([^)]*)\))?\s*$")


class BlockError(BaseModel):
    word: str
    reason: str


class ImportReport(BaseModel):
    imported: int = 0  # new senses created
    updated: int = 0  # existing senses updated
    skipped: int = 0  # invalid blocks (== len(errors))
    errors: list[BlockError] = []
    unresolved_relations: list[str] = []

    def __str__(self) -> str:  # CLI-friendly
        lines = [
            f"imported={self.imported} updated={self.updated} skipped={self.skipped}",
        ]
        for e in self.errors:
            lines.append(f"  error [{e.word}]: {e.reason.splitlines()[0]}")
        for u in self.unresolved_relations:
            lines.append(f"  unresolved relation: {u}")
        return "\n".join(lines)


# --- upsert helpers (natural keys, idempotent) ------------------------------


def _word(db: Session, text: str, lang: str) -> Word:
    w = db.scalar(select(Word).where(Word.text == text, Word.lang == lang))
    if w is None:
        w = Word(text=text, lang=lang)
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


def _link_tag(db: Session, sense_id: int, tag_id: int) -> None:
    exists = db.scalar(
        select(SenseTag).where(
            SenseTag.sense_id == sense_id, SenseTag.tag_id == tag_id
        )
    )
    if exists is None:
        db.add(SenseTag(sense_id=sense_id, tag_id=tag_id))


def _example(db: Session, sense_id: int, ex: ExampleIn) -> None:
    row = db.scalar(
        select(SenseExample).where(
            SenseExample.sense_id == sense_id, SenseExample.text == ex.text
        )
    )
    if row is None:
        row = SenseExample(sense_id=sense_id, text=ex.text)
        db.add(row)
    row.pron_ru = ex.pron_ru
    row.ru = ex.ru
    row.ipa = ex.ipa


def _upsert_sense(db: Session, s: SenseIn) -> tuple[Sense, bool]:
    """Returns (sense, created). Natural key (word_id, coalesce(gloss,''))."""
    word = _word(db, s.word, s.lang)
    sense = db.scalar(
        select(Sense).where(
            Sense.word_id == word.id,
            func.coalesce(Sense.gloss, "") == (s.gloss or ""),
        )
    )
    created = sense is None
    if sense is None:
        sense = Sense(word_id=word.id, gloss=s.gloss, lang=s.lang)
        db.add(sense)

    # Scalars + JSON (all set before flush; pos is NOT NULL).
    sense.ru = s.ru
    sense.pos = s.pos
    sense.level = s.level
    sense.register = s.register_
    sense.frequency = s.frequency
    sense.pron_ru = s.pron_ru
    sense.ipa = s.ipa
    sense.image = s.image
    sense.connotation = s.connotation
    sense.intensity = s.intensity
    sense.synset = s.synset
    sense.nuance = s.nuance
    sense.valency = s.valency
    sense.forms = s.forms
    sense.collocations = s.collocations
    sense.source = Source.CURATED
    db.flush()

    # Tags: explicit TagIn list + traits -> lexical tags.
    for tag_in in s.tags:
        t = _tag(db, tag_in.name, tag_in.kind)
        _link_tag(db, sense.id, t.id)
    for trait in s.traits:
        t = _tag(db, trait, TagKind.LEXICAL)
        _link_tag(db, sense.id, t.id)

    for ex in s.examples:
        _example(db, sense.id, ex)

    return sense, created


# --- relation resolution (pass-2) -------------------------------------------


def _parse_target(target: str) -> tuple[str, str | None]:
    m = _TARGET_RE.match(target)
    if m is None:
        return target.strip(), None
    word = m.group(1).strip()
    gloss = m.group(2).strip() if m.group(2) else None
    return word, gloss


def _resolve_target(db: Session, target: str, lang: str) -> Sense | None:
    word_text, gloss = _parse_target(target)
    candidates = (
        db.execute(
            select(Sense)
            .join(Word, Sense.word_id == Word.id)
            .where(Word.text == word_text, Sense.lang == lang)
            .order_by(Sense.id)
        )
        .scalars()
        .all()
    )
    if not candidates:
        return None
    if gloss:
        for c in candidates:
            if c.gloss and gloss.lower() in c.gloss.lower():
                return c
        return None  # gloss given but no match -> leave unresolved
    return candidates[0]


def _upsert_relation(db: Session, from_id: int, to_id: int, rel: RelationIn) -> None:
    exists = db.scalar(
        select(SenseRelation).where(
            SenseRelation.from_sense_id == from_id,
            SenseRelation.to_sense_id == to_id,
            SenseRelation.type == rel.type,
        )
    )
    if exists is None:
        db.add(
            SenseRelation(
                from_sense_id=from_id,
                to_sense_id=to_id,
                type=rel.type,
                bridge=rel.bridge,
                source=Source.CURATED,
            )
        )
    elif rel.bridge is not None:
        exists.bridge = rel.bridge


# --- orchestration ----------------------------------------------------------


def import_senses(db: Session, items: list[SenseIn]) -> ImportReport:
    report = ImportReport()

    # pass-1: words / senses / tags / examples
    pending: list[tuple[int, str, RelationIn]] = []
    for s in items:
        sense, created = _upsert_sense(db, s)
        report.imported += int(created)
        report.updated += int(not created)
        for rel in s.relations:
            pending.append((sense.id, s.lang, rel))
    db.flush()

    # pass-2: resolve relation targets (all senses are now persisted)
    for from_id, lang, rel in pending:
        target = _resolve_target(db, rel.target, lang)
        if target is None:
            report.unresolved_relations.append(f"{rel.type.value} -> {rel.target}")
            continue
        _upsert_relation(db, from_id, target.id, rel)

    db.commit()
    return report


def import_file(path: str | Path, db: Session | None = None) -> ImportReport:
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or []
    if not isinstance(raw, list):
        raise ValueError(f"{path}: expected a YAML list of sense blocks")

    items: list[SenseIn] = []
    errors: list[BlockError] = []
    for block in raw:
        try:
            items.append(SenseIn(**block))
        except ValidationError as e:
            word = block.get("word", "?") if isinstance(block, dict) else "?"
            errors.append(BlockError(word=str(word), reason=str(e)))

    own_session = db is None
    db = db or SessionLocal()
    try:
        report = import_senses(db, items)
    finally:
        if own_session:
            db.close()

    report.errors = errors
    report.skipped = len(errors)
    return report


def main(argv: list[str] | None = None) -> None:
    args = argv if argv is not None else sys.argv[1:]
    if not args:
        # default to the bundled seed corpus
        root = Path(__file__).resolve().parent.parent.parent
        target = root / "content" / "en_US" / "seed.yml"
    else:
        target = Path(args[0])
    print(import_file(target))


if __name__ == "__main__":
    main()
