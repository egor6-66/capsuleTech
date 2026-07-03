"""voice router — /voice/* (ADR 067 D2 contract, per-request engine).

/voice/speak is a deterministic GET — same (engine, text, lang, voice, speed)
always yields the same WAV. Two cache tiers (brief: speak-cache):
- HTTP: Cache-Control + ETag derived from the canonical request params (the
  synthesis never has to run to answer an If-None-Match revalidation);
- server: in-memory LRU keyed by the same hash, so a cold browser still costs
  one synthesis per unique phrase, not one per click.
"""

from __future__ import annotations

import hashlib
import threading
from typing import Annotated

from cachetools import LRUCache
from fastapi import APIRouter, Header, HTTPException, Query, Response

from . import engine as voice_engine
from .config import settings

router = APIRouter(prefix="/voice", tags=["voice"])

_CACHE_CONTROL = "public, max-age=86400"
# WAV of a short phrase ~60KB -> ~30MB ceiling at 512 entries.
_cache: LRUCache = LRUCache(maxsize=512)
_cache_lock = threading.Lock()


def _etag(engine: str, text: str, lang: str, voice: str | None, speed: float) -> str:
    canonical = "|".join([engine, lang, voice or "", str(speed), text])
    return f'"{hashlib.sha256(canonical.encode("utf-8")).hexdigest()}"'


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
    if_none_match: Annotated[str | None, Header()] = None,
) -> Response:
    if not text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    try:
        eng = voice_engine.get_engine(engine)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # ETag keys on the RESOLVED engine (eng.name, default substituted) — a
    # VOICE_ENGINE change must not revalidate against another engine's cache.
    etag = _etag(eng.name, text, lang, voice, speed)
    headers = {"Cache-Control": _CACHE_CONTROL, "ETag": etag}
    if if_none_match == etag:
        return Response(status_code=304, headers=headers)

    with _cache_lock:
        audio = _cache.get(etag)
    if audio is None:
        try:
            audio = eng.synthesize(text, lang=lang, voice=voice, speed=speed)
        except ModuleNotFoundError as exc:
            # Engines are lazy opt-in extras — a registered engine may not be
            # installed in this venv (e.g. chatterbox×xtts conflict, see README).
            raise HTTPException(
                status_code=503,
                detail=(
                    f"engine {eng.name!r} is registered but not installed in this venv "
                    f"(missing module {exc.name!r}); install: uv sync --extra voice-{eng.name}"
                ),
            ) from exc
        with _cache_lock:
            _cache[etag] = audio
    return Response(content=audio, media_type="audio/wav", headers=headers)
