"""Lessons vault importer — happy path on the эталон drill + all 5 reject rules."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy import func, select

from capsule_lang import lessons_repo as repo
from capsule_lang.lessons_importer import import_vault
from capsule_lang.models import (
    Concept,
    Drill,
    DrillItem,
    DrillWord,
    Lesson,
    Rule,
    Word,
)

FIXTURE_VAULT = Path(__file__).parent / "fixtures" / "vault"
DRILL_WORDS = ["eat", "call", "leave", "come", "already"]


def _seed_words(db, lemmas=DRILL_WORDS, lang="en_US"):
    for w in lemmas:
        db.add(Word(text=w, lang=lang))
    db.commit()


def _count(db, model) -> int:
    return db.scalar(select(func.count()).select_from(model))


def _write(vault: Path, rel: str, body: str) -> None:
    p = vault / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(body, encoding="utf-8")


# --- happy path --------------------------------------------------------------


def test_import_reference_vault(blank_db):
    _seed_words(blank_db)
    report = import_vault(FIXTURE_VAULT, blank_db)

    # 4 real entities (rule, concept, drill, lesson); methods/ is ignored.
    assert report.imported == 4
    assert report.updated == 0
    assert report.rejected == []

    assert _count(blank_db, Rule) == 1
    assert _count(blank_db, Concept) == 1
    assert _count(blank_db, Drill) == 1
    assert _count(blank_db, Lesson) == 1
    assert _count(blank_db, DrillItem) == 2
    assert _count(blank_db, DrillWord) == 5  # all 5 lemmas resolved

    # rule id derived from filename + title from the body H1 (frontmatter has
    # neither — matches real reference-rule files) — rule №0
    rule = blank_db.get(Rule, "grammar-verbs-tenses")
    assert rule is not None
    assert rule.title == "5d. Глаголы и времена"

    drill = blank_db.get(Drill, "past-perfect-which-clause")
    assert drill.dimension.value == "tense"  # эталон omits the field → default
    assert [i.position for i in drill.items] == [0, 1]
    # near_miss survives as JSON with both match modes
    modes = {nm["match"] for i in drill.items for nm in (i.near_miss or [])}
    assert modes == {"contains", "regex"}
    assert [w.text for w in drill.words] == DRILL_WORDS  # order preserved


def test_import_is_idempotent(blank_db):
    _seed_words(blank_db)
    import_vault(FIXTURE_VAULT, blank_db)
    counts = {m.__name__: _count(blank_db, m) for m in (Rule, Concept, Drill, Lesson)}

    r2 = import_vault(FIXTURE_VAULT, blank_db)
    assert r2.imported == 0
    assert r2.updated == 4
    after = {m.__name__: _count(blank_db, m) for m in (Rule, Concept, Drill, Lesson)}
    assert after == counts
    # items re-inserted, not duplicated
    assert _count(blank_db, DrillItem) == 2
    assert _count(blank_db, DrillWord) == 5


# --- reject rules (one case per validation rule) -----------------------------


def test_reject_id_not_filename(blank_db, tmp_path):
    _write(
        tmp_path,
        "grammar/grammar-x.md",
        "---\nid: something-else\ntype: rule\ntitle: X\n---\nbody",
    )
    report = import_vault(tmp_path, blank_db)
    assert report.imported == 0
    assert any("id" in r.reason for r in report.rejected)
    assert _count(blank_db, Rule) == 0


def test_reject_drill_item_no_time_marker(blank_db, tmp_path):
    # promptRu without a time marker AND no context → ambiguous → reject.
    _write(
        tmp_path,
        "drills/ambiguous.md",
        "---\nid: ambiguous\ntype: drill\ntitle: A\nlevel: L2\nrule: grammar-x\n"
        "graboTag: g\nitems:\n  - promptRu: \"Он ушёл, когда я пришёл.\"\n"
        "    answerEn: \"He left when I came.\"\n---\nbody",
    )
    report = import_vault(tmp_path, blank_db)
    assert report.imported == 0
    assert any("неоднозначен по времени" in r.reason for r in report.rejected)


def test_reject_word_not_in_dictionary(blank_db, tmp_path):
    # rule resolves (file present); the drill word does not exist → reject.
    _write(tmp_path, "grammar/grammar-x.md", "---\nid: grammar-x\ntype: rule\ntitle: X\n---\nbody")
    _write(
        tmp_path,
        "drills/w.md",
        "---\nid: w\ntype: drill\ntitle: W\nlevel: L1\nrule: grammar-x\ngraboTag: g\n"
        "words: [zzznotaword]\nitems:\n  - promptRu: \"Я уже поел.\"\n"
        "    answerEn: \"I ate.\"\n---\nb",
    )
    report = import_vault(tmp_path, blank_db)
    assert any("нет в словаре" in r.reason for r in report.rejected)
    assert _count(blank_db, Drill) == 0  # drill rejected; rule may land


def test_reject_unresolved_reference(blank_db, tmp_path):
    # drill.rule points at a rule that doesn't exist anywhere → reject.
    _write(
        tmp_path,
        "drills/orphan.md",
        "---\nid: orphan\ntype: drill\ntitle: O\nlevel: L1\nrule: missing-rule\n"
        "graboTag: g\nitems:\n  - promptRu: \"Я уже поел.\"\n    answerEn: \"I ate.\"\n---\nb",
    )
    report = import_vault(tmp_path, blank_db)
    assert any("rule" in r.reason and "не найдено" in r.reason for r in report.rejected)
    assert _count(blank_db, Drill) == 0


# --- dimension gate (round-3, ADR 069) ---------------------------------------


def test_other_dimension_skips_time_marker(blank_db, tmp_path):
    # A non-tense drill: prompt carries NO time marker and NO context, yet it
    # imports — the marker check is gated to `dimension: tense` only.
    _write(tmp_path, "grammar/grammar-x.md", "---\nid: grammar-x\ntype: rule\ntitle: X\n---\nb")
    _write(
        tmp_path,
        "drills/pron.md",
        "---\nid: pron\ntype: drill\ntitle: P\nlevel: L1\ndimension: other\nrule: grammar-x\n"
        "graboTag: g\nitems:\n"
        '  - promptRu: "Дай им книгу."\n    answerEn: "Give them a book."\n---\nb',
    )
    report = import_vault(tmp_path, blank_db)
    assert report.rejected == []
    d = blank_db.get(Drill, "pron")
    assert d is not None and d.dimension.value == "other"


def test_unknown_dimension_rejected(blank_db, tmp_path):
    _write(tmp_path, "grammar/grammar-x.md", "---\nid: grammar-x\ntype: rule\ntitle: X\n---\nb")
    _write(
        tmp_path,
        "drills/bad.md",
        "---\nid: bad\ntype: drill\ntitle: B\nlevel: L1\ndimension: bogus\nrule: grammar-x\n"
        "graboTag: g\nitems:\n"
        '  - promptRu: "Я уже поел."\n    answerEn: "I ate."\n---\nb',
    )
    report = import_vault(tmp_path, blank_db)
    assert any("dimension" in r.reason for r in report.rejected)
    assert _count(blank_db, Drill) == 0


# --- accordion-IA grouping: rule.category / concept.kind (ADR 069) -----------


def test_rule_category_defaults_from_folder(blank_db, tmp_path):
    # No `category` in frontmatter → derived from the folder the rule lives in.
    _write(tmp_path, "grammar/g.md", "---\ntype: rule\n---\n# G\nb")
    _write(tmp_path, "phonetics/p.md", "---\ntype: rule\n---\n# P\nb")
    _write(tmp_path, "speech/s.md", "---\ntype: rule\n---\n# S\nb")
    report = import_vault(tmp_path, blank_db)
    assert report.rejected == []
    assert blank_db.get(Rule, "g").category.value == "grammar"
    assert blank_db.get(Rule, "p").category.value == "phonetics"
    assert blank_db.get(Rule, "s").category.value == "speech"
    # sort_order defaults to 100 when `order` is omitted
    assert blank_db.get(Rule, "g").sort_order == 100


def test_rule_explicit_category_and_order_win(blank_db, tmp_path):
    # An explicit category overrides the folder default; `order` maps to sort_order.
    _write(
        tmp_path,
        "grammar/x.md",
        "---\ntype: rule\ncategory: speech\norder: 7\n---\n# X\nb",
    )
    report = import_vault(tmp_path, blank_db)
    assert report.rejected == []
    row = blank_db.get(Rule, "x")
    assert row.category.value == "speech"
    assert row.sort_order == 7


def test_reject_unknown_rule_category(blank_db, tmp_path):
    _write(tmp_path, "grammar/bad.md", "---\ntype: rule\ncategory: bogus\n---\n# B\nb")
    report = import_vault(tmp_path, blank_db)
    assert report.imported == 0
    assert any("category" in r.reason for r in report.rejected)
    assert _count(blank_db, Rule) == 0


def test_concept_kind_defaults_approach(blank_db, tmp_path):
    _write(
        tmp_path,
        "lessons/concepts/c.md",
        "---\ntype: concept\ntitle: C\nprinciple: p\n---\n# C\nbody",
    )
    report = import_vault(tmp_path, blank_db)
    assert report.rejected == []
    row = blank_db.get(Concept, "c")
    assert row.kind.value == "approach"
    assert row.sort_order == 100


def test_reject_unknown_concept_kind(blank_db, tmp_path):
    _write(
        tmp_path,
        "lessons/concepts/c.md",
        "---\ntype: concept\ntitle: C\nprinciple: p\nkind: bogus\n---\n# C\nbody",
    )
    report = import_vault(tmp_path, blank_db)
    assert report.imported == 0
    assert any("kind" in r.reason for r in report.rejected)
    assert _count(blank_db, Concept) == 0


def test_rules_sorted_by_category_then_order_then_title(blank_db, tmp_path):
    # category (grammar<phonetics<speech) → sort_order → title.
    _write(tmp_path, "phonetics/p1.md", "---\ntype: rule\norder: 100\n---\n# Zeta\nb")
    _write(tmp_path, "grammar/g1.md", "---\ntype: rule\norder: 5\n---\n# Beta\nb")
    _write(tmp_path, "grammar/g2.md", "---\ntype: rule\norder: 5\n---\n# Alpha\nb")
    _write(tmp_path, "speech/s1.md", "---\ntype: rule\norder: 1\n---\n# Mid\nb")
    import_vault(tmp_path, blank_db)
    assert [r.id for r in repo.list_rules(blank_db)] == ["g2", "g1", "p1", "s1"]


def test_reject_invalid_regex_near_miss(blank_db, tmp_path):
    _write(
        tmp_path,
        "drills/badre.md",
        "---\nid: badre\ntype: drill\ntitle: B\nlevel: L1\nrule: grammar-x\ngraboTag: g\n"
        "items:\n  - promptRu: \"Я уже поел.\"\n    answerEn: \"I ate.\"\n    nearMiss:\n"
        "      - match: regex\n        pattern: \"(\"\n        hint: broken\n---\nb",
    )
    report = import_vault(tmp_path, blank_db)
    assert any("regex" in r.reason for r in report.rejected)
    assert _count(blank_db, Drill) == 0
