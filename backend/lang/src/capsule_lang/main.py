"""FastAPI app — health + lang router (ADR 064 / 067)."""

from fastapi import FastAPI

from .api import router as lang_router
from .lessons_api import router as lessons_router

app = FastAPI(title="capsule-lang", version="0.1.0")


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(lang_router)
app.include_router(lessons_router)
