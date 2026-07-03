"""FastAPI app — health + voice router (ADR 067 D2)."""

from fastapi import FastAPI

from .api import router as voice_router

app = FastAPI(title="capsule-voice", version="0.1.0")


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(voice_router)
