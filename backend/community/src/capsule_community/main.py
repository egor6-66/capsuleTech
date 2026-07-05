"""FastAPI app — community social core (ADR 071).

health + public community router (profile / members / stats / leaderboard) +
internal events channel. The auth session client lives on app.state and is
resolved per-request by the auth-passthrough dependencies (ADR 071 D2).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .api import community_router, internal_router
from .clients.auth import AuthClient
from .config import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.auth = AuthClient(settings.auth_url)
    yield
    await app.state.auth.aclose()


app = FastAPI(title="capsule-community", version="0.1.0", lifespan=lifespan)

if settings.cors_origins:
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(community_router)
app.include_router(internal_router)
