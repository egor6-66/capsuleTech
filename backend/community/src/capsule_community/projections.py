"""Point/stat projections over the event journal (ADR 071 D4).

Rules v1 are a plain, explicitly-documented config: a `kind → points` table and
a `kind → counter-name` table. New metrics extend these dicts and re-run over
the already-accumulated history — no data migration. As volume grows these
on-the-fly SQL/Python aggregates become materialized projections (ADR 071 D4).
"""

from __future__ import annotations

from collections.abc import Iterable

from .models import Event
from .schemas import StatsOut

# kind → points awarded. Extended as new event kinds land.
KIND_POINTS: dict[str, int] = {
    "drill.passed": 10,
}

# kind → human-friendly per-app counter surfaced in stats (e.g. drills_passed).
KIND_COUNTERS: dict[str, str] = {
    "drill.passed": "drills_passed",
}


def points_for(kind: str) -> int:
    return KIND_POINTS.get(kind, 0)


def build_stats(user_id: int, events: Iterable[Event]) -> StatsOut:
    """Aggregate one user's events into total + per-app points/counters."""
    per_app: dict[str, dict] = {}
    for e in events:
        app = per_app.setdefault(e.source_app, {"points": 0})
        app["points"] += points_for(e.kind)
        counter = KIND_COUNTERS.get(e.kind)
        if counter:
            app[counter] = app.get(counter, 0) + 1
    total = sum(app["points"] for app in per_app.values())
    return StatsOut(user_id=user_id, total_points=total, per_app=per_app)


def score_by_user(events: Iterable[Event]) -> dict[int, int]:
    """points-per-user across a (possibly app-filtered) event set — leaderboard."""
    scores: dict[int, int] = {}
    for e in events:
        scores[e.user_id] = scores.get(e.user_id, 0) + points_for(e.kind)
    return scores
