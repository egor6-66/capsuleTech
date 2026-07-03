"""FastAPI app — health + auth router (ADR 068)."""

from fastapi import FastAPI

from .api import router as auth_router
from .config import settings

app = FastAPI(title="capsule-auth", version="0.1.0")

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


app.include_router(auth_router)
