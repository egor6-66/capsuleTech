"""Full vault import — words (senses) then lessons, in one command (ADR 069/070).

The teacher vault is the single authoring zone: it holds both the lessons graph
(markdown+frontmatter under drills/grammar/lessons/…) **and** new dictionary
words (`{vault}/words/*.yaml`, the same sense-YAML format as the vocab packs).

A round is one command. Words go first — drills resolve their `words[]` against
the dictionary, so the vocabulary must exist before the lessons pass runs. Both
passes share one session; each commits its own work.

Air-gapped: the vault path is never baked into code — it comes from the caller
(`LESSONS_VAULT` env via `settings`, or an explicit argument).
"""

from __future__ import annotations

import sys
from pathlib import Path

from pydantic import BaseModel
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal
from .importer import ImportReport, import_file
from .lessons_importer import LessonsReport, import_vault

# Dictionary words live here inside the vault (curated sense-YAML, one list per
# file — identical format to the former `content/en_US/vocab/*.yaml` packs).
WORDS_SUBDIR = "words"


class VaultReport(BaseModel):
    words: list[ImportReport] = []
    lessons: LessonsReport = LessonsReport()

    @property
    def words_imported(self) -> int:
        return sum(r.imported for r in self.words)

    @property
    def words_updated(self) -> int:
        return sum(r.updated for r in self.words)

    @property
    def words_skipped(self) -> int:
        return sum(r.skipped for r in self.words)

    def __str__(self) -> str:
        lines = [
            f"words:   imported={self.words_imported} "
            f"updated={self.words_updated} skipped={self.words_skipped}"
        ]
        for r in self.words:
            for e in r.errors:
                lines.append(f"  word error [{e.word}]: {e.reason.splitlines()[0]}")
        lines.append(f"lessons: {self.lessons}")
        return "\n".join(lines)


def import_words(vault: Path, db: Session) -> list[ImportReport]:
    """Import every `{vault}/words/*.yaml` sense pack (order = filename sort)."""
    words_dir = vault / WORDS_SUBDIR
    if not words_dir.is_dir():
        return []
    return [import_file(p, db=db) for p in sorted(words_dir.glob("*.yaml"))]


def import_full(vault: str | Path, db: Session, lang: str | None = None) -> VaultReport:
    """One round: dictionary words first, then the lessons graph."""
    vault = Path(vault)
    if not vault.is_dir():
        raise ValueError(f"vault not found: {vault}")

    words = import_words(vault, db)
    lessons = import_vault(vault, db, lang)
    return VaultReport(words=words, lessons=lessons)


def import_full_path(vault: str | Path, db: Session | None = None) -> VaultReport:
    own = db is None
    db = db or SessionLocal()
    try:
        return import_full(vault, db)
    finally:
        if own:
            db.close()


def main(argv: list[str] | None = None) -> None:
    args = argv if argv is not None else sys.argv[1:]
    vault = args[0] if args else settings.lessons_vault
    if not vault:
        print(
            "error: vault path required — pass it as an argument or set LESSONS_VAULT",
            file=sys.stderr,
        )
        raise SystemExit(2)
    print(import_full_path(vault))


if __name__ == "__main__":
    main()
