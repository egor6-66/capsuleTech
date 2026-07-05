"""Image engine seam — Protocol + lazy registry (mirror of backend/voice engine.py).

The engine is swappable by config (`IMAGE_ENGINE`) without touching the
endpoint. Engines are registered as lazy factories so importing the image
router never pulls a heavy ML stack (torch/diffusers) — the model loads only
when an engine is actually requested. The `fake` engine is torch-free and
always available (deterministic PNG for CI).
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Protocol, runtime_checkable

from .config import settings

# Guard rails so a bogus ?size= can't ask the model for a 100k×100k canvas.
_MIN_DIM = 64
_MAX_DIM = 2048


@runtime_checkable
class ImageEngine(Protocol):
    name: str

    def generate(
        self,
        prompt: str,
        *,
        size: str = "512x512",
        seed: int = 0,
    ) -> bytes:
        """Return PNG bytes for the prompt (same params -> same bytes)."""
        ...


def parse_size(size: str) -> tuple[int, int]:
    """Parse a "WxH" string into (width, height). Raises ValueError on garbage."""
    parts = size.lower().split("x")
    if len(parts) != 2:
        raise ValueError(f"size must be 'WxH' (got {size!r})")
    try:
        w, h = int(parts[0]), int(parts[1])
    except ValueError as exc:
        raise ValueError(f"size must be 'WxH' with integers (got {size!r})") from exc
    for dim in (w, h):
        if not (_MIN_DIM <= dim <= _MAX_DIM):
            raise ValueError(f"size dimensions must be in [{_MIN_DIM}, {_MAX_DIM}] (got {size!r})")
    return w, h


def _make_fake() -> ImageEngine:
    from .engines.fake import FakeEngine

    return FakeEngine()


def _make_sdxl_turbo() -> ImageEngine:
    from .engines.sdxl import SdxlTurboEngine

    return SdxlTurboEngine()


def _make_flux_schnell() -> ImageEngine:
    from .engines.flux import FluxSchnellEngine

    return FluxSchnellEngine()


# name -> lazy factory. Adding an engine = one entry + one file in engines/.
_FACTORIES: dict[str, Callable[[], ImageEngine]] = {
    "fake": _make_fake,
    "sdxl-turbo": _make_sdxl_turbo,
    "flux-schnell": _make_flux_schnell,
}
_INSTANCES: dict[str, ImageEngine] = {}


def list_engines() -> list[str]:
    """Registered engine names (no model load — just the registry keys)."""
    return sorted(_FACTORIES)


def get_engine(name: str | None = None) -> ImageEngine:
    name = name or settings.image_engine
    if name not in _FACTORIES:
        available = ", ".join(sorted(_FACTORIES))
        raise ValueError(f"unknown image engine {name!r} (available: {available})")
    if name not in _INSTANCES:
        _INSTANCES[name] = _FACTORIES[name]()  # builds + caches (model loads once)
    return _INSTANCES[name]
