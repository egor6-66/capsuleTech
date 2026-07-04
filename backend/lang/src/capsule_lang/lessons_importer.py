"""Vault → lang importer for lessons content (ADR 069 D3).

Reads markdown-with-frontmatter from the teacher vault, validates each file with
a **reject-with-reason** policy (never a silent skip), resolves cross-entity and
dictionary references, and idempotently upserts by id (== filename stem).

Pipeline:
  1. discover  — walk the mapped folders (methods/briefs/journal ignored);
  2. parse     — split frontmatter/body, pick the model by `type` discriminator;
  3. validate  — intra-file rules (id/kebab, drill-item time marker, nearMiss);
  4. resolve   — refs (rule/concepts/…) + dictionary words, to a fixpoint
                 (rejecting A can orphan B → repeat until stable);
  5. upsert    — base rows then link tables, idempotent per id.

Air-gapped: the vault path never lives in code — it comes from the caller
(`LESSONS_VAULT` env via `settings`, or an explicit argument).
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from pydantic import BaseModel, ValidationError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal
from .enums import DrillDimension, MatchMode, Source
from .lessons_schemas import ConceptIn, DrillIn, LessonIn, RuleIn
from .models import (
    Concept,
    ConceptRelatedConcept,
    ConceptRelatedRule,
    Drill,
    DrillConcept,
    DrillItem,
    DrillWord,
    Lesson,
    LessonConcept,
    LessonDrill,
    LessonRule,
    Rule,
    Word,
)

# Folder → entity `type` the importer expects there (finalочка mapping).
# `lessons/concepts/` must be checked before `lessons/` (longest prefix wins).
# methods/ briefs/ journal/ (and any unlisted folder) are simply never scanned.
FOLDER_TYPES: list[tuple[str, str]] = [
    ("lessons/concepts", "concept"),
    ("lessons", "lesson"),
    ("drills", "drill"),
    ("grammar", "rule"),
    ("phonetics", "rule"),
    ("speech", "rule"),
]

_KEBAB_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_FORBIDDEN_ID = re.compile(r"(^|-)(temp|wip|new|draft)(-|$)")
_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", re.DOTALL)

# Russian time-marker heuristic v1 — EXTENSIBLE dictionary (ADR 069 §2.2).
# Matched with word boundaries so "уже" fires on «уже поел» but not «хуже»/«нужен».
# Deliberately excludes bare «когда» (a conjunction — «ушёл, когда пришёл» is the
# canonical ambiguous case that must require `context`). When unsure the rule
# prefers a false-negative (reject) over letting an ambiguous item through.
_TIME_MARKERS: list[str] = [
    "уже",
    "вчера",
    "сегодня",
    "завтра",
    "сейчас",
    "потом",
    "затем",
    "раньше",
    "ранее",
    "позже",
    "позднее",
    "недавно",
    "давно",
    "только что",
    "только-только",
    "до того",
    "до этого",
    "после того",
    "после этого",
    "к тому времени",
    "к тому моменту",
    "прежде",
    "сначала",
    "когда-то",
    "никогда",
    "всегда",
    "часто",
    "иногда",
    "ещё не",
    "еще не",
    "пока не",
    "в прошлом",
    "на днях",
]
_MARKER_RE = re.compile(
    r"\b(?:" + "|".join(re.escape(m) for m in _TIME_MARKERS) + r")\b",
    re.IGNORECASE,
)


class Reject(BaseModel):
    file: str
    reason: str


@dataclass
class ParsedEntity:
    kind: str  # concept | rule | drill | lesson
    model: BaseModel
    file: str


class LessonsReport(BaseModel):
    imported: int = 0  # new rows created
    updated: int = 0  # existing rows updated
    rejected: list[Reject] = []

    def __str__(self) -> str:
        lines = [f"imported={self.imported} updated={self.updated} rejected={len(self.rejected)}"]
        for r in self.rejected:
            lines.append(f"  reject [{r.file}]: {r.reason}")
        return "\n".join(lines)


# --- parsing -----------------------------------------------------------------


def _split_frontmatter(text: str) -> tuple[dict, str]:
    """Returns (frontmatter dict, markdown body). Raises ValueError if malformed."""
    m = _FRONTMATTER_RE.match(text.lstrip("﻿"))
    if m is None:
        raise ValueError("нет YAML-frontmatter (--- в начале файла)")
    front = yaml.safe_load(m.group(1)) or {}
    if not isinstance(front, dict):
        raise ValueError("frontmatter не является YAML-объектом")
    return front, m.group(2).strip()


_MODELS: dict[str, type[BaseModel]] = {
    "concept": ConceptIn,
    "rule": RuleIn,
    "drill": DrillIn,
    "lesson": LessonIn,
}


def _parse_file(path: Path, expected_type: str) -> ParsedEntity:
    """Parse one vault file into its typed model. Raises ValueError with reason."""
    front, body = _split_frontmatter(path.read_text(encoding="utf-8"))

    ftype = front.get("type")
    if ftype is None:
        raise ValueError("нет поля `type` во frontmatter")
    if ftype not in _MODELS:
        raise ValueError(f"неизвестный type `{ftype}`")

    data = dict(front)
    # Rule №0: имя файла = id. The id may be omitted from frontmatter (the
    # finalочка tells teachers to add ONLY `type` to reference rules) — derive
    # it from the filename. An explicit id, if present, must still match (the
    # `_validate_intra` id==stem check catches rename/copy drift).
    data.setdefault("id", path.stem)
    # Title may live in the body's H1 rather than frontmatter — that's the case
    # for reference rules («тело не трогаем, добавляем только type»). Frontmatter
    # title, when present (drills/lessons/concepts), wins.
    h1 = _first_h1(body)
    if h1:
        data.setdefault("title", h1)
    if ftype in ("concept", "rule"):
        data["body"] = body  # body = markdown content, not a frontmatter key

    try:
        model = _MODELS[ftype](**data)
    except ValidationError as e:
        raise ValueError(_first_error(e)) from e

    _validate_intra(path, ftype, model)
    return ParsedEntity(kind=ftype, model=model, file=str(path))


def _first_h1(body: str) -> str | None:
    """Text of the first markdown H1 (`# ...`) in the body, verbatim, or None.

    The section enumerator some rules carry (`# 5d. Глаголы …`) is kept as-is —
    stripping it would be a content decision that belongs to the vault, not here.
    """
    for line in body.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return None


def _first_error(e: ValidationError) -> str:
    err = e.errors()[0]
    loc = ".".join(str(x) for x in err["loc"])
    return f"{loc}: {err['msg']}"


# --- intra-file validation (reject with reason) ------------------------------


def _validate_intra(path: Path, kind: str, model: BaseModel) -> None:
    ident = model.id  # type: ignore[attr-defined]
    stem = path.stem
    if ident != stem:
        raise ValueError(f"id `{ident}` != имя файла `{stem}` (правило №0)")
    if not _KEBAB_RE.match(ident):
        raise ValueError(f"id `{ident}` не kebab-case")
    if _FORBIDDEN_ID.search(ident):
        raise ValueError(f"id `{ident}` содержит temp/wip/new/draft")

    if kind == "drill":
        dimension = model.dimension  # type: ignore[attr-defined]
        for i, item in enumerate(model.items):  # type: ignore[attr-defined]
            _validate_drill_item(i, item, dimension)


def _validate_drill_item(index: int, item: object, dimension: DrillDimension) -> None:
    # The time-marker check gates ONLY tense drills (round-3 decision, ADR 069):
    # for other dimensions the prompt is disambiguated by its answer/nearMiss, not
    # by a time word, so `context` is a recommendation rather than a requirement.
    if dimension == DrillDimension.TENSE:
        text = (item.prompt_ru or "") + "\n" + (item.context or "")  # type: ignore[attr-defined]
        if not _MARKER_RE.search(text):
            raise ValueError(
                f"item[{index}]: промпт неоднозначен по времени — "
                f"добавь маркер времени в promptRu или заполни context"
            )
    for j, nm in enumerate(item.near_miss):  # type: ignore[attr-defined]
        if nm.match == MatchMode.REGEX:
            try:
                re.compile(nm.pattern)
            except re.error as exc:
                raise ValueError(
                    f"item[{index}].nearMiss[{j}]: невалидный regex `{nm.pattern}` ({exc})"
                ) from exc


# --- discovery ---------------------------------------------------------------


def _discover(vault: Path) -> list[tuple[Path, str]]:
    """(file, expected_type) for every scannable file, longest-prefix folder wins."""
    found: list[tuple[Path, str]] = []
    for rel, etype in FOLDER_TYPES:
        base = vault / rel
        if not base.is_dir():
            continue
        for p in sorted(base.glob("*.md")):
            found.append((p, etype))
    return found


# --- reference resolution (to a fixpoint) ------------------------------------


@dataclass
class _Registry:
    rules: set[str] = field(default_factory=set)
    concepts: set[str] = field(default_factory=set)
    drills: set[str] = field(default_factory=set)
    lessons: set[str] = field(default_factory=set)


def _unresolved_reason(e: ParsedEntity, reg: _Registry, words: set[str]) -> str | None:
    """First failing reference for entity `e`, or None if all resolve."""
    m = e.model
    if e.kind == "concept":
        for r in m.related_rules:  # type: ignore[attr-defined]
            if r not in reg.rules:
                return f"relatedRules -> `{r}` не найдено"
        for c in m.related_concepts:  # type: ignore[attr-defined]
            if c not in reg.concepts:
                return f"relatedConcepts -> `{c}` не найдено"
    elif e.kind == "drill":
        if m.rule not in reg.rules:  # type: ignore[attr-defined]
            return f"rule -> `{m.rule}` не найдено"  # type: ignore[attr-defined]
        for c in m.concept:  # type: ignore[attr-defined]
            if c not in reg.concepts:
                return f"concept -> `{c}` не найдено"
        for w in m.words:  # type: ignore[attr-defined]
            if w not in words:
                return f"words -> `{w}` нет в словаре — сначала заведи слово"
    elif e.kind == "lesson":
        for c in m.concepts:  # type: ignore[attr-defined]
            if c not in reg.concepts:
                return f"concepts -> `{c}` не найдено"
        for r in m.rules:  # type: ignore[attr-defined]
            if r not in reg.rules:
                return f"rules -> `{r}` не найдено"
        for d in m.drills:  # type: ignore[attr-defined]
            if d not in reg.drills:
                return f"drills -> `{d}` не найдено"
    return None


def _resolve(
    entities: list[ParsedEntity], reg: _Registry, words: set[str]
) -> tuple[list[ParsedEntity], list[Reject]]:
    """Drop entities with unresolvable refs, iterating until the set is stable."""
    survivors = list(entities)
    rejects: list[Reject] = []
    while True:
        still_bad: list[tuple[ParsedEntity, str]] = []
        for e in survivors:
            reason = _unresolved_reason(e, reg, words)
            if reason is not None:
                still_bad.append((e, reason))
        if not still_bad:
            return survivors, rejects
        bad_ids = {e.model.id for e, _ in still_bad}  # type: ignore[attr-defined]
        for e, reason in still_bad:
            rejects.append(Reject(file=e.file, reason=reason))
        # remove rejected ids from registry so dependents re-check next round
        reg.rules -= bad_ids
        reg.concepts -= bad_ids
        reg.drills -= bad_ids
        reg.lessons -= bad_ids
        survivors = [
            e for e in survivors if e.model.id not in bad_ids  # type: ignore[attr-defined]
        ]


# --- upsert (idempotent by id) -----------------------------------------------


def _upsert_scalar(db: Session, e: ParsedEntity, report: LessonsReport) -> None:
    m = e.model
    if e.kind == "rule":
        row = db.get(Rule, m.id)  # type: ignore[attr-defined]
        report.imported += row is None
        report.updated += row is not None
        if row is None:
            row = Rule(id=m.id)  # type: ignore[attr-defined]
            db.add(row)
        row.title, row.body, row.tags, row.source = (
            m.title, m.body, m.tags, Source.CURATED,  # type: ignore[attr-defined]
        )
    elif e.kind == "concept":
        row = db.get(Concept, m.id)  # type: ignore[attr-defined]
        report.imported += row is None
        report.updated += row is not None
        if row is None:
            row = Concept(id=m.id)  # type: ignore[attr-defined]
            db.add(row)
        row.title, row.principle, row.body = m.title, m.principle, m.body  # type: ignore[attr-defined]
        row.tags = m.tags  # type: ignore[attr-defined]
        row.examples = [ex.model_dump() for ex in m.examples]  # type: ignore[attr-defined]
        row.source = Source.CURATED
    elif e.kind == "drill":
        row = db.get(Drill, m.id)  # type: ignore[attr-defined]
        report.imported += row is None
        report.updated += row is not None
        if row is None:
            row = Drill(id=m.id)  # type: ignore[attr-defined]
            db.add(row)
        row.title, row.level, row.tags = m.title, m.level, m.tags  # type: ignore[attr-defined]
        row.dimension = m.dimension  # type: ignore[attr-defined]
        row.rule_id, row.grabo_tag, row.source = (
            m.rule, m.grabo_tag, Source.CURATED,  # type: ignore[attr-defined]
        )
        db.flush()
        db.execute(delete(DrillItem).where(DrillItem.drill_id == row.id))
        for pos, item in enumerate(m.items):  # type: ignore[attr-defined]
            db.add(
                DrillItem(
                    drill_id=row.id,
                    position=pos,
                    prompt_ru=item.prompt_ru,
                    context=item.context,
                    answer_en=item.answer_en,
                    accept=list(item.accept),
                    near_miss=[nm.model_dump() for nm in item.near_miss],
                    grabo_tag=item.grabo_tag,
                )
            )
    elif e.kind == "lesson":
        row = db.get(Lesson, m.id)  # type: ignore[attr-defined]
        report.imported += row is None
        report.updated += row is not None
        if row is None:
            row = Lesson(id=m.id)  # type: ignore[attr-defined]
            db.add(row)
        row.title, row.level, row.tags = m.title, m.level, m.tags  # type: ignore[attr-defined]
        row.intro, row.source = m.intro, Source.CURATED  # type: ignore[attr-defined]
    db.flush()


def _wire_links(db: Session, e: ParsedEntity, word_ids: dict[str, int]) -> None:
    m = e.model
    if e.kind == "concept":
        db.execute(delete(ConceptRelatedRule).where(ConceptRelatedRule.concept_id == m.id))  # type: ignore[attr-defined]
        db.execute(delete(ConceptRelatedConcept).where(ConceptRelatedConcept.concept_id == m.id))  # type: ignore[attr-defined]
        for pos, r in enumerate(m.related_rules):  # type: ignore[attr-defined]
            db.add(ConceptRelatedRule(concept_id=m.id, rule_id=r, position=pos))  # type: ignore[attr-defined]
        for pos, c in enumerate(m.related_concepts):  # type: ignore[attr-defined]
            db.add(ConceptRelatedConcept(concept_id=m.id, related_id=c, position=pos))  # type: ignore[attr-defined]
    elif e.kind == "drill":
        db.execute(delete(DrillConcept).where(DrillConcept.drill_id == m.id))  # type: ignore[attr-defined]
        db.execute(delete(DrillWord).where(DrillWord.drill_id == m.id))  # type: ignore[attr-defined]
        for pos, c in enumerate(m.concept):  # type: ignore[attr-defined]
            db.add(DrillConcept(drill_id=m.id, concept_id=c, position=pos))  # type: ignore[attr-defined]
        for pos, w in enumerate(m.words):  # type: ignore[attr-defined]
            db.add(DrillWord(drill_id=m.id, word_id=word_ids[w], position=pos))  # type: ignore[attr-defined]
    elif e.kind == "lesson":
        db.execute(delete(LessonConcept).where(LessonConcept.lesson_id == m.id))  # type: ignore[attr-defined]
        db.execute(delete(LessonRule).where(LessonRule.lesson_id == m.id))  # type: ignore[attr-defined]
        db.execute(delete(LessonDrill).where(LessonDrill.lesson_id == m.id))  # type: ignore[attr-defined]
        for pos, c in enumerate(m.concepts):  # type: ignore[attr-defined]
            db.add(LessonConcept(lesson_id=m.id, concept_id=c, position=pos))  # type: ignore[attr-defined]
        for pos, r in enumerate(m.rules):  # type: ignore[attr-defined]
            db.add(LessonRule(lesson_id=m.id, rule_id=r, position=pos))  # type: ignore[attr-defined]
        for pos, d in enumerate(m.drills):  # type: ignore[attr-defined]
            db.add(LessonDrill(lesson_id=m.id, drill_id=d, position=pos))  # type: ignore[attr-defined]


# --- orchestration -----------------------------------------------------------

_ORDER = {"rule": 0, "concept": 1, "drill": 2, "lesson": 3}


def import_vault(vault: str | Path, db: Session, lang: str | None = None) -> LessonsReport:
    lang = lang or settings.default_lang
    vault = Path(vault)
    if not vault.is_dir():
        raise ValueError(f"vault not found: {vault}")

    report = LessonsReport()
    parsed: list[ParsedEntity] = []

    # 1-3. discover + parse + intra-validate
    for path, etype in _discover(vault):
        try:
            parsed.append(_parse_file(path, etype))
        except ValueError as exc:
            report.rejected.append(Reject(file=str(path), reason=str(exc)))

    # dictionary words available for drill `words[]` resolution
    word_ids: dict[str, int] = dict(
        db.execute(select(Word.text, Word.id).where(Word.lang == lang)).all()
    )
    words = set(word_ids)

    # registry seeded with this batch + rows already in the DB (incremental import)
    reg = _Registry(
        rules={p.model.id for p in parsed if p.kind == "rule"}
        | set(db.execute(select(Rule.id)).scalars()),
        concepts={p.model.id for p in parsed if p.kind == "concept"}
        | set(db.execute(select(Concept.id)).scalars()),
        drills={p.model.id for p in parsed if p.kind == "drill"}
        | set(db.execute(select(Drill.id)).scalars()),
        lessons={p.model.id for p in parsed if p.kind == "lesson"}
        | set(db.execute(select(Lesson.id)).scalars()),
    )

    # 4. resolve refs to a fixpoint
    survivors, ref_rejects = _resolve(parsed, reg, words)
    report.rejected.extend(ref_rejects)

    # 5. upsert base rows (dependency order) then link tables
    survivors.sort(key=lambda e: _ORDER[e.kind])
    for e in survivors:
        _upsert_scalar(db, e, report)
    for e in survivors:
        _wire_links(db, e, word_ids)

    db.commit()
    return report


def import_vault_path(vault: str | Path, db: Session | None = None) -> LessonsReport:
    own = db is None
    db = db or SessionLocal()
    try:
        return import_vault(vault, db)
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
    print(import_vault_path(vault))


if __name__ == "__main__":
    main()
