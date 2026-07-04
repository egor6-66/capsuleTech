"""Drill answer checker (ADR 069 phase 2).

Pure verdict logic — no network, no FastAPI. The BFF fetches the drill from
lang (the answer key never leaves the backend) and hands one item plus the
learner answer here. Kept separate so normalization and matching are
unit-tested in isolation.

Why on the backend (user decision, canon): "the fronts are just interfaces" —
one implementation serves web + future bots, the reference answers never leak
to the browser, and the phase-3 event ("stepped on a rake") is born at the
point of checking.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

_WS = re.compile(r"\s+")
# Typographic apostrophe variants folded to a straight ' so "I'd" == "I'd".
_APOSTROPHES = "‘’ʼ´`"


def normalize(text: str) -> str:
    """Canonicalize an answer / reference for comparison.

    trim → unify apostrophes → lowercase → collapse whitespace → drop trailing
    sentence punctuation (.!?). Applied to both the learner answer and the
    references (answerEn + accept), so surface noise (case, spacing, «.», curly
    quotes) never decides correctness.
    """
    s = text
    for ch in _APOSTROPHES:
        s = s.replace(ch, "'")
    s = _WS.sub(" ", s.lower()).strip()
    return s.rstrip(".!?").strip()


@lru_cache(maxsize=256)
def _compile(pattern: str) -> re.Pattern[str]:
    # Compiled once per distinct pattern across requests (ADR 069 D2).
    return re.compile(pattern, re.IGNORECASE)


def _near_miss_hit(near_miss: dict[str, Any], norm_answer: str) -> bool:
    if near_miss.get("match") == "regex":
        return _compile(near_miss["pattern"]).search(norm_answer) is not None
    # contains — substring over normalized strings.
    return normalize(near_miss["pattern"]) in norm_answer


def check_item(item: dict[str, Any], answer: str, reveal: bool) -> dict[str, Any]:
    """Grade one drill item. Returns ``{verdict, hint?, answer?}``.

    correct  — normalized answer equals answerEn or any accept[].
    near_miss — first author-ordered nearMiss pattern that hits → its hint.
    wrong    — nothing matched.
    reveal   — echoes answerEn as ``answer`` (verdict is still computed).
    """
    norm_answer = normalize(answer)
    references = {normalize(item["answerEn"])}
    references.update(normalize(a) for a in item.get("accept") or [])

    verdict = "wrong"
    hint: str | None = None
    if norm_answer in references:
        verdict = "correct"
    else:
        # Author order wins — the first matching pattern gives its hint.
        for near_miss in item.get("nearMiss") or []:
            if _near_miss_hit(near_miss, norm_answer):
                verdict = "near_miss"
                hint = near_miss["hint"]
                break

    # NOTE — ADR 069 phase 3 seam: a `near_miss`/`wrong` verdict here is known
    # together with the drill/item graboTag → this is the future emit point for
    # the "stepped on a rake" event (user domain, separate ADR). No emit yet.
    result: dict[str, Any] = {"verdict": verdict}
    if hint is not None:
        result["hint"] = hint
    if reveal:
        result["answer"] = item["answerEn"]
    return result
