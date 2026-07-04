"""image router — /image/* (ADR 067 contract, per-request engine).

/image/render is a deterministic GET — same (engine, prompt, size, seed) always
yields the same PNG. Two cache tiers (brief: image-service disk-cache):
- HTTP: Cache-Control + ETag derived from the canonical request params (the
  generation never has to run to answer an If-None-Match revalidation);
- server: DISK cache keyed by the same hash. Generation is expensive (seconds
  on GPU) and PNGs are large, so the cache is on disk and survives restarts —
  unlike voice's in-memory LRU.
"""

from __future__ import annotations

import hashlib
import os
import tempfile
import threading
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Query, Response

from . import engine as image_engine
from .config import settings
from .engine import parse_size

router = APIRouter(prefix="/image", tags=["image"])

_CACHE_CONTROL = "public, max-age=86400"
_cache_lock = threading.Lock()


def _cache_key(engine: str, prompt: str, size: str, seed: int) -> str:
    canonical = "|".join([engine, size, str(seed), prompt])
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _cache_path(key: str) -> Path:
    return Path(settings.cache_dir) / f"{key}.png"


def _cache_read(path: Path) -> bytes | None:
    try:
        return path.read_bytes()
    except FileNotFoundError:
        return None


def _cache_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Atomic write: temp file in the same dir + rename, so a crashed generation
    # never leaves a truncated PNG that a later request would serve as a hit.
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


@router.get("/engines")
def engines() -> dict:
    """Registered engines + the configured default (front-end engine switcher)."""
    return {"engines": image_engine.list_engines(), "default": settings.image_engine}


@router.get(
    "/render",
    responses={200: {"content": {"image/png": {}}}},
    response_class=Response,
)
def render(
    prompt: Annotated[str, Query(description="text prompt to render")],
    engine: Annotated[
        str | None, Query(description="image engine; default IMAGE_ENGINE")
    ] = None,
    size: str = settings.default_size,
    seed: int = settings.default_seed,
    if_none_match: Annotated[str | None, Header()] = None,
) -> Response:
    if not prompt.strip():
        raise HTTPException(status_code=422, detail="prompt is required")
    try:
        parse_size(size)  # validate early so a bad ?size= is a 422, not a 500
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    try:
        eng = image_engine.get_engine(engine)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # ETag keys on the RESOLVED engine (eng.name, default substituted) — an
    # IMAGE_ENGINE change must not revalidate against another engine's cache.
    key = _cache_key(eng.name, prompt, size, seed)
    etag = f'"{key}"'
    headers = {"Cache-Control": _CACHE_CONTROL, "ETag": etag}
    if if_none_match == etag:
        return Response(status_code=304, headers=headers)

    path = _cache_path(key)
    with _cache_lock:
        png = _cache_read(path)
        if png is None:
            try:
                png = eng.generate(prompt, size=size, seed=seed)
            except ModuleNotFoundError as exc:
                # Engines are lazy opt-in extras — a registered engine may not be
                # installed in this venv yet (extra not synced).
                raise HTTPException(
                    status_code=503,
                    detail=(
                        f"engine {eng.name!r} is registered but not installed in this venv "
                        f"(missing module {exc.name!r}); install: uv sync --extra gen"
                    ),
                ) from exc
            _cache_write(path, png)
    return Response(content=png, media_type="image/png", headers=headers)
