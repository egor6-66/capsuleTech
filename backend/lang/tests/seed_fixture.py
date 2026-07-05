"""Test-only seed corpus — the tiny 6-sense demo dataset.

Relocated from the former `content/en_US/seed.yml` when real content moved to
the teacher vault as the single authoring zone (ADR 070). `backend/lang` ships
only code now; this small corpus exists purely to give the test suite a fixed,
self-contained dataset. Real lexicon is fed via the vault importer.
"""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from capsule_lang.importer import ImportReport, import_file

SEED_FILE = Path(__file__).parent / "fixtures" / "senses" / "seed.yml"


def seed(db: Session) -> ImportReport:
    """Run the canonical importer over the bundled test corpus (idempotent)."""
    return import_file(SEED_FILE, db=db)
