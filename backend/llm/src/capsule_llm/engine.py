"""LLM engine seam — Protocol + lazy registry (mirror of backend/image engine.py).

The engine is swappable by config (`LLM_ENGINE`) without touching the endpoint.
Engines are registered as lazy factories so importing the llm router never pulls
a heavy inference stack (llama-cpp) — the model loads only when an engine is
actually requested. The `fake` engine is dependency-free and always available
(deterministic output for CI).
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, Protocol, runtime_checkable

from .config import settings


class EngineNotConfigured(RuntimeError):
    """Engine is registered but missing required runtime config (e.g. no model path).

    Distinct from `ModuleNotFoundError` (extra not installed): the code is there,
    the operator just hasn't supplied a model. Surfaced as an actionable 503.
    """


@runtime_checkable
class LlmEngine(Protocol):
    name: str

    def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        schema: dict[str, Any] | None = None,
        max_tokens: int = 512,
        temperature: float = 0.2,
    ) -> str:
        """Return the completion text.

        When `schema` is given the returned string is guaranteed to be valid JSON
        conforming to that JSON Schema (grammar/json-schema enforcement) — the
        router parses it into `{"json": ...}`. Otherwise it's free-form `{"text"}`.
        """
        ...


def _make_fake() -> LlmEngine:
    from .engines.fake import FakeEngine

    return FakeEngine()


def _make_llama_cpp() -> LlmEngine:
    from .engines.llamacpp import LlamaCppEngine

    return LlamaCppEngine()


# name -> lazy factory. Adding an engine = one entry + one file in engines/.
_FACTORIES: dict[str, Callable[[], LlmEngine]] = {
    "fake": _make_fake,
    "llama-cpp": _make_llama_cpp,
}
_INSTANCES: dict[str, LlmEngine] = {}


def list_engines() -> list[str]:
    """Registered engine names (no model load — just the registry keys)."""
    return sorted(_FACTORIES)


def get_engine(name: str | None = None) -> LlmEngine:
    name = name or settings.llm_engine
    if name not in _FACTORIES:
        available = ", ".join(sorted(_FACTORIES))
        raise ValueError(f"unknown llm engine {name!r} (available: {available})")
    if name not in _INSTANCES:
        _INSTANCES[name] = _FACTORIES[name]()  # builds + caches (model loads once)
    return _INSTANCES[name]
