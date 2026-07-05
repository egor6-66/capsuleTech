"""FastAPI app — health + image router (ADR 067)."""

from fastapi import FastAPI

from .api import router as image_router

app = FastAPI(title="capsule-image", version="0.1.0")


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(image_router)
