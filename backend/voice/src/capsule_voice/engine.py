"""TTS engine seam — Protocol + lazy registry (moved from backend/learn, ADR 067 D1).

The engine is swappable by config (`VOICE_ENGINE`) without touching the
endpoint. Engines are registered as lazy factories so importing the voice
router never pulls a heavy ML stack (torch) — the model loads only when an
engine is actually requested.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Protocol, runtime_checkable

from .config import settings


@runtime_checkable
class TTSEngine(Protocol):
    name: str

    def synthesize(
        self,
        text: str,
        *,
        lang: str = "en_US",
        voice: str | None = None,
        speed: float = 1.0,
    ) -> bytes:
        """Return WAV bytes (the engine knows its own sample rate)."""
        ...


def _make_kokoro() -> TTSEngine:
    from .engines.kokoro import KokoroEngine

    return KokoroEngine()


def _make_chatterbox() -> TTSEngine:
    from .engines.chatterbox import ChatterboxEngine

    return ChatterboxEngine()


# name -> lazy factory. Adding an engine = one entry + one file in engines/.
_FACTORIES: dict[str, Callable[[], TTSEngine]] = {
    "kokoro": _make_kokoro,
    "chatterbox": _make_chatterbox,
}
_INSTANCES: dict[str, TTSEngine] = {}


def list_engines() -> list[str]:
    """Registered engine names (no model load — just the registry keys)."""
    return sorted(_FACTORIES)


def get_engine(name: str | None = None) -> TTSEngine:
    name = name or settings.voice_engine
    if name not in _FACTORIES:
        available = ", ".join(sorted(_FACTORIES))
        raise ValueError(f"unknown TTS engine {name!r} (available: {available})")
    if name not in _INSTANCES:
        _INSTANCES[name] = _FACTORIES[name]()  # builds + caches (model loads once)
    return _INSTANCES[name]
