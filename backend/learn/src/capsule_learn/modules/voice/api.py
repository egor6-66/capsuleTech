"""voice router — /learn/voice/* (brief §Endpoint)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response

from ...config import settings
from . import engine

router = APIRouter(prefix="/learn/voice", tags=["voice"])


@router.get(
    "/speak",
    responses={200: {"content": {"audio/wav": {}}}},
    response_class=Response,
)
def speak(
    text: Annotated[str, Query(description="text to synthesize")],
    lang: str = settings.default_lang,
    voice: str | None = None,
    speed: Annotated[float, Query(gt=0, le=4)] = 1.0,
) -> Response:
    if not text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    audio = engine.get_engine().synthesize(text, lang=lang, voice=voice, speed=speed)
    return Response(content=audio, media_type="audio/wav")
