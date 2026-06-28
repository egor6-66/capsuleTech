"""voice router — /learn/voice/* (brief §Endpoint, per-request engine)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response

from ...config import settings
from . import engine as voice_engine

router = APIRouter(prefix="/learn/voice", tags=["voice"])


@router.get("/engines")
def engines() -> dict:
    """Registered engines + the configured default (front-end engine switcher)."""
    return {"engines": voice_engine.list_engines(), "default": settings.voice_engine}


@router.get(
    "/speak",
    responses={200: {"content": {"audio/wav": {}}}},
    response_class=Response,
)
def speak(
    text: Annotated[str, Query(description="text to synthesize")],
    engine: Annotated[
        str | None, Query(description="TTS engine; default VOICE_ENGINE")
    ] = None,
    lang: str = settings.default_lang,
    voice: str | None = None,
    speed: Annotated[float, Query(gt=0, le=4)] = 1.0,
) -> Response:
    if not text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    try:
        eng = voice_engine.get_engine(engine)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    audio = eng.synthesize(text, lang=lang, voice=voice, speed=speed)
    return Response(content=audio, media_type="audio/wav")
