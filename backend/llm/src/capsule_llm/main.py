"""FastAPI app — health + llm router (ADR 074)."""

from fastapi import FastAPI

from .api import router as llm_router

app = FastAPI(title="capsule-llm", version="0.1.0")


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(llm_router)
