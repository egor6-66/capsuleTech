"""Seed = the importer run on the bundled YAML corpus (ADR 064-A A6).

`seed(db)` keeps the legacy entry-point (tests/conftest) but now delegates to
the canonical importer — one ingestion path, no parallel hand-written upserts.
"""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from .db import Base, SessionLocal, engine
from .importer import ImportReport, import_file

SEED_FILE = (
    Path(__file__).resolve().parent.parent.parent
    / "content"
    / "lang"
    / "en_US"
    / "seed.yml"
)


def seed(db: Session) -> ImportReport:
    return import_file(SEED_FILE, db=db)


def main() -> None:
    # Convenience for `python -m capsule_learn.seed` without Alembic (dev only).
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        report = seed(db)
    print(report)


if __name__ == "__main__":
    main()
