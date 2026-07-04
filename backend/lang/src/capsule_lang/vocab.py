"""Vocab pack = the importer run over the curated teacher-vocab corpus.

Companion to `seed.py`'s tiny bundled demo corpus: this is the real, larger
curated wordlist (levels L0-L4), consolidated into `content/en_US/vocab/`
from `docs/_meta/briefs/learn-vocab/` (2026-07-03). Loaded on demand — not
part of the pytest fixture, which stays on the small demo seed.
"""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from .db import Base, SessionLocal, engine
from .importer import ImportReport, import_file

VOCAB_DIR = (
    Path(__file__).resolve().parent.parent.parent / "content" / "en_US" / "vocab"
)


def import_vocab(db: Session) -> list[ImportReport]:
    return [import_file(p, db=db) for p in sorted(VOCAB_DIR.glob("*.yaml"))]


def main() -> None:
    # Convenience for `python -m capsule_lang.vocab` without Alembic (dev only).
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        reports = import_vocab(db)
    for r in reports:
        print(r)


if __name__ == "__main__":
    main()
