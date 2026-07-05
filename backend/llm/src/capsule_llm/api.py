"""llm router — /llm/* (ADR 074 contract, per-request engine).

Stateless generation: no cache (unlike image/voice — completions are neither
deterministic nor cheap to key on temperature/sampling). The service is "dumb":
it generates; the task-specific prompts live in the CONSUMERS (community canon
judge ADR 073, tutor-feedback checker ADR 069) — never here.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from . import engine as llm_engine
from .config import settings
from .engine import EngineNotConfigured

router = APIRouter(prefix="/llm", tags=["llm"])


class GenerateRequest(BaseModel):
    # `schema` is the wire key but shadows BaseModel internals — bind via alias.
    model_config = ConfigDict(populate_by_name=True)

    prompt: str
    system: str | None = None
    json_schema: dict[str, Any] | None = Field(default=None, alias="schema")
    max_tokens: int = Field(default=512, ge=1, le=8192)
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    engine: str | None = None


@router.get("/engines")
def engines() -> dict:
    """Registered engines + the configured default (front-end engine switcher)."""
    return {"engines": llm_engine.list_engines(), "default": settings.llm_engine}


@router.post("/generate")
def generate(body: GenerateRequest) -> dict:
    if not body.prompt.strip():
        raise HTTPException(status_code=422, detail="prompt is required")
    try:
        eng = llm_engine.get_engine(body.engine)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        text = eng.generate(
            body.prompt,
            system=body.system,
            schema=body.json_schema,
            max_tokens=body.max_tokens,
            temperature=body.temperature,
        )
    except EngineNotConfigured as exc:
        # Registered engine, weights not supplied (air-gapped) — actionable 503.
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ModuleNotFoundError as exc:
        # Registered-but-not-installed engine (lazy extras) -> actionable 503.
        raise HTTPException(
            status_code=503,
            detail=(
                f"engine {eng.name!r} is registered but not installed in this venv "
                f"(missing module {exc.name!r}); install: uv sync --extra gen"
            ),
        ) from exc

    if body.json_schema is not None:
        try:
            return {"json": json.loads(text)}
        except json.JSONDecodeError as exc:
            # Grammar enforcement should make this impossible; surface it plainly
            # rather than returning malformed data as if it were valid.
            raise HTTPException(
                status_code=502, detail=f"engine returned invalid JSON: {exc}"
            ) from exc
    return {"text": text}
