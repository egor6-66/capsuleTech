"""FastAPI app — health + lang router (ADR 064)."""

from fastapi import FastAPI

from .modules.lang import router as lang_router
from .modules.voice import router as voice_router

app = FastAPI(title="capsule-learn", version="0.1.0")


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(lang_router)
app.include_router(voice_router)
