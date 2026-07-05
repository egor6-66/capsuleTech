"""Router aggregation — profile + events modules (ADR 071 D3/D4)."""

from fastapi import APIRouter

from .events import internal_router
from .events import router as events_router
from .profile import router as profile_router

# Public community surface (goes through the gateway as /api/community/*).
community_router = APIRouter()
community_router.include_router(profile_router)
community_router.include_router(events_router)

__all__ = ["community_router", "internal_router"]
