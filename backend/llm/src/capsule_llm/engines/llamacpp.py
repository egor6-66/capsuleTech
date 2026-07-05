"""llama-cpp engine — in-process GGUF inference via llama-cpp-python (ADR 065/074).

Local, self-hosted, air-gapped: the model is a GGUF file the operator supplies
via `LLM_MODEL_PATH` — there is NO default download and no hardcoded URL. Without
that env the engine stays in the registry but 503s "model not configured".

Heavy dep (`llama-cpp-python`) is imported lazily and lives behind the optional
`gen` extra — the base service, the `fake` engine and CI stay dependency-free.
CPU by default; set `N_GPU_LAYERS>0` to offload layers to the GPU.

Install: `uv sync --extra gen`.
Structured output: when `schema` is passed, llama.cpp enforces a JSON grammar
derived from the schema, so the returned text is always valid, conforming JSON.
"""

from __future__ import annotations

from typing import Any

from ..config import settings
from ..engine import EngineNotConfigured


class LlamaCppEngine:
    name = "llama-cpp"

    def __init__(self) -> None:
        self._llm = None

    def _model(self):
        # Config gate first: air-gapped weights are user-supplied. Checking before
        # the import means "no model" is an actionable 503 even when the `gen`
        # extra isn't installed — the operator has to set this either way.
        if not settings.llm_model_path:
            raise EngineNotConfigured(
                "llama-cpp: model not configured — set LLM_MODEL_PATH to a local GGUF file"
            )
        if self._llm is None:
            from llama_cpp import Llama

            self._llm = Llama(
                model_path=settings.llm_model_path,
                n_gpu_layers=settings.n_gpu_layers,
                n_ctx=settings.n_ctx,
                verbose=False,
            )
        return self._llm

    def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        schema: dict[str, Any] | None = None,
        max_tokens: int = 512,
        temperature: float = 0.2,
    ) -> str:
        llm = self._model()
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        kwargs: dict[str, Any] = {
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if schema is not None:
            # llama.cpp compiles a GBNF grammar from the JSON Schema — the sampler
            # can only emit tokens that keep the output valid JSON per the schema.
            kwargs["response_format"] = {"type": "json_object", "schema": schema}

        out = llm.create_chat_completion(**kwargs)
        return out["choices"][0]["message"]["content"] or ""
