"""Event journal + projections — /internal/events (write) + /community/{stats,leaderboard}.

The journal is written only by app backends server-to-server, gated by a
shared-secret header `X-Internal-Key` and NOT published through the gateway
(ADR 071 D4). Stats and leaderboard are public projections over the journal.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session as DbSession

from .. import projections, repo
from ..config import settings
from ..db import get_db
from ..schemas import (
    EventBatchIn,
    EventBatchOut,
    LeaderboardEntry,
    LeaderboardOut,
    StatsOut,
)
from ..storage import media_url

DbDep = Annotated[DbSession, Depends(get_db)]

# ---- public projections (/community/*) ---------------------------------------
router = APIRouter(prefix="/community", tags=["projections"])


@router.get("/stats/{user_id}", response_model=StatsOut)
def user_stats(user_id: int, db: DbDep) -> StatsOut:
    events = repo.events_for_user(db, user_id)
    return projections.build_stats(user_id, events)


@router.get("/leaderboard", response_model=LeaderboardOut)
def leaderboard(db: DbDep, app: str | None = None, limit: int = 20) -> LeaderboardOut:
    events = repo.all_events(db, source_app=app)
    scores = projections.score_by_user(events)
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:limit]

    entries: list[LeaderboardEntry] = []
    for user_id, points in ranked:
        profile = repo.get_profile(db, user_id)
        entries.append(
            LeaderboardEntry(
                user_id=user_id,
                nick=profile.nick if profile else f"user{user_id}",
                avatar_url=media_url(profile.avatar_key) if profile else None,
                points=points,
            )
        )
    return LeaderboardOut(app=app, entries=entries)


# ---- internal write channel (/internal/*) ------------------------------------
internal_router = APIRouter(prefix="/internal", tags=["internal"])


def require_internal_key(x_internal_key: Annotated[str | None, Header()] = None) -> None:
    """Shared-secret gate (ADR 071 D4). Unconfigured channel answers 503."""
    if not settings.internal_key:
        raise HTTPException(status_code=503, detail="internal channel not configured")
    if x_internal_key != settings.internal_key:
        raise HTTPException(status_code=403, detail="invalid internal key")


@internal_router.post(
    "/events",
    response_model=EventBatchOut,
    status_code=201,
    dependencies=[Depends(require_internal_key)],
)
def post_events(body: EventBatchIn, db: DbDep) -> EventBatchOut:
    inserted = repo.insert_events(db, body.events)
    return EventBatchOut(inserted=inserted)
