"""voice router — /voice/* (ADR 067 D2 contract, per-request engine).

/voice/speak is a deterministic GET — same (engine, text, lang, voice, speed,
VOICE_MODEL_VERSION) always yields the same WAV. Three serving tiers:
- HTTP: Cache-Control + ETag derived from the canonical request params (the
  synthesis never has to run to answer an If-None-Match revalidation);
- persistent (ADR 076): MinIO object store for curated `kind` (words / phrases)
  — synthesize once, serve forever. Best-effort: storage never fails the
  request, it falls through to LRU + synthesis;
- server LRU: in-memory, keyed by the same hash, so a cold browser still costs
  one synthesis per unique phrase, not one per click. Holds `dynamic` too.

`kind` is a storage policy (which tier persists), not part of the ETag — the
ETag is pure synthesis determinism.
"""

from __future__ import annotations

import hashlib
import logging
import threading
from typing import Annotated, Literal

from cachetools import LRUCache
from fastapi import APIRouter, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field

from . import engine as voice_engine
from . import storage
from .config import settings

log = logging.getLogger("capsule_voice.api")

router = APIRouter(prefix="/voice", tags=["voice"])

_CACHE_CONTROL = "public, max-age=86400"
# WAV of a short phrase ~60KB -> ~30MB ceiling at 512 entries.
_cache: LRUCache = LRUCache(maxsize=512)
_cache_lock = threading.Lock()

Kind = Literal["dynamic", "words", "phrases"]
PersistKind = Literal["words", "phrases"]


def _digest(engine: str, text: str, lang: str, voice: str | None, speed: float) -> str:
    """Canonical synthesis hash — includes the model version so a bump both
    invalidates the ETag and points at a fresh storage key (no stale audio)."""
    canonical = "|".join(
        [engine, lang, voice or "", str(speed), text, settings.voice_model_version]
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _synthesize(eng, text: str, lang: str, voice: str | None, speed: float) -> bytes:
    try:
        return eng.synthesize(text, lang=lang, voice=voice, speed=speed)
    except ModuleNotFoundError as exc:
        # Engines are lazy opt-in extras — a registered engine may not be
        # installed in this venv yet (extra not synced).
        raise HTTPException(
            status_code=503,
            detail=(
                f"engine {eng.name!r} is registered but not installed in this venv "
                f"(missing module {exc.name!r}); install: uv sync --extra voice-{eng.name}"
            ),
        ) from exc


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
    kind: Annotated[
        Kind, Query(description="storage policy: dynamic=LRU only, words/phrases=persist")
    ] = "dynamic",
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
    sha = _digest(eng.name, text, lang, voice, speed)
    etag = f'"{sha}"'
    headers = {"Cache-Control": _CACHE_CONTROL, "ETag": etag}
    if if_none_match == etag:
        return Response(status_code=304, headers=headers)

    persist = kind != "dynamic"
    obj_key = storage.key(kind, eng.name, sha) if persist else None

    # 1. persistent tier (curated kinds only) — best-effort, storage never 5xx.
    if persist:
        try:
            stored = storage.get(obj_key)
        except Exception as exc:  # noqa: BLE001 — degrade to LRU + synthesis
            log.warning("persist get(%s) failed, falling through: %s", obj_key, exc)
            stored = None
        if stored is not None:
            return Response(content=stored, media_type="audio/wav", headers=headers)

    # 2. server LRU.
    with _cache_lock:
        audio = _cache.get(etag)

    # 3. synthesis.
    if audio is None:
        audio = _synthesize(eng, text, lang, voice, speed)
        with _cache_lock:
            _cache[etag] = audio
        if persist:
            try:
                storage.put(obj_key, audio)
            except Exception as exc:  # noqa: BLE001 — persist is best-effort
                log.warning("persist put(%s) failed: %s", obj_key, exc)

    return Response(content=audio, media_type="audio/wav", headers=headers)


class WarmText(BaseModel):
    text: str
    lang: str = settings.default_lang
    voice: str | None = None
    speed: Annotated[float, Field(gt=0, le=4)] = 1.0


class WarmRequest(BaseModel):
    texts: list[WarmText]
    engines: list[str]
    kind: PersistKind = "words"


@router.post("/warm")
def warm(req: WarmRequest) -> dict:
    """Pre-synthesize curated clips into the persistent tier (warm-at-ingest).

    Idempotent: a (text × engine) whose key already exists is skipped. One
    pair's failure (unknown engine, synthesis error) never fails the batch.
    """
    generated = 0
    skipped = 0
    for engine_name in req.engines:
        try:
            eng = voice_engine.get_engine(engine_name)
        except ValueError:
            log.warning("warm: unknown engine %r, skipping", engine_name)
            continue
        for item in req.texts:
            try:
                sha = _digest(eng.name, item.text, item.lang, item.voice, item.speed)
                obj_key = storage.key(req.kind, eng.name, sha)
                if storage.exists(obj_key):
                    skipped += 1
                    continue
                audio = eng.synthesize(
                    item.text, lang=item.lang, voice=item.voice, speed=item.speed
                )
                storage.put(obj_key, audio)
                generated += 1
            except Exception as exc:  # noqa: BLE001 — one pair must not fail the batch
                log.warning(
                    "warm: %r on %r failed: %s", item.text, eng.name, exc
                )
                continue
    return {"generated": generated, "skipped": skipped}
