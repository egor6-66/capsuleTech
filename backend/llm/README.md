# capsule-llm

Stateless LLM-generation capability service (ADR 065/074) — the text mirror of
`backend/image`. One capability, no DB, port **:8007**. Turns a prompt (+ optional
system + JSON Schema) into text or structured JSON. **Internal** service — no
gateway route; the first consumers are other backends (community canon judge
ADR 073, tutor-feedback checker ADR 069). Dev runs on Windows, prod target is
Docker/Linux.

The service is deliberately **dumb**: it generates. Task-specific prompts (judge
rubric, tutor feedback, example generation) live in the **consumers**, never
here. A full agent-loop (tools, memory, multi-step) is a separate layer *on top*
(ADR 065 ф.4-5).

Pluggable engines behind an `LlmEngine` Protocol + lazy registry, per-request
override via the request-body `engine`. Phase-1 engines:

| Engine | Niche | License | Default | Extra |
|---|---|---|---|---|
| `fake` | deterministic text / minimal-schema JSON for CI (no ML) | — | — | built-in |
| `llama-cpp` | in-process GGUF inference (self-hosted, air-gapped) | engine: MIT | ✅ | `gen` |

## Models (weights are the operator's choice)

The `llama-cpp` engine loads a **GGUF file you supply** via `LLM_MODEL_PATH` —
there is no default download and no hardcoded URL (air-gapped, ADR 065). Pick a
model whose **weights license** allows your use. Free-licensed 1–4B references
that run on a 3070 Ti / CPU (informational, not endorsements):

| Model (class) | ~Size | Weights license | Notes |
|---|---|---|---|
| Qwen2.5-1.5B / 3B Instruct | 1–3B | Apache 2.0 | strong JSON/tool following at small size |
| Llama-3.2-1B / 3B Instruct | 1–3B | Llama 3.2 Community | check the acceptable-use terms |

Download a GGUF quant (e.g. Q4_K_M) from the model's repo yourself and point
`LLM_MODEL_PATH` at it. Rejected class: non-commercial-only weights (per ADR 065).

## Setup

Toolchain — [uv](https://docs.astral.sh/uv/) (`pip install uv`). All commands
from `backend/llm/`:

```bash
uv python install 3.12                       # once, if 3.12 is not installed
uv sync --extra dev                          # base service + dev tools (light, no ML)
uv run uvicorn capsule_llm.main:app --port 8007 --reload
uv run pytest                                # registry/contract tests, no model needed
uv run ruff check .
```

The engine is an **opt-in extra** (lazy-imported — the base service, the `fake`
engine and CI never load it):

```bash
uv sync --extra dev --extra gen              # llama-cpp-python (CPU wheel)
```

### GPU

The PyPI `gen` extra installs a **CPU** wheel. For GPU offload, install the CUDA
wheel from llama-cpp-python's prebuilt index, then set `N_GPU_LAYERS`:

```bash
uv pip install llama-cpp-python \
  --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu124
N_GPU_LAYERS=35 uv run uvicorn capsule_llm.main:app --port 8007
```

Unlike `backend/image`, this pulls **no torch** — llama.cpp is self-contained.

nx targets: `nx run backend-llm:serve|test:py|lint:py`.

## API (ADR 074 contract)

- `GET /health` → `{"status":"ok"}`
- `GET /llm/engines` → `{"engines":["fake","llama-cpp"],"default":"llama-cpp"}`
- `POST /llm/generate` body:
  ```json
  {"prompt": "...", "system": "...?", "schema": {...}?,
   "max_tokens": 512, "temperature": 0.2, "engine": "...?"}
  ```
  - → `{"text": "..."}`, or `{"json": {...}}` when `schema` is given (llama.cpp
    enforces a JSON grammar from the schema, so the output is valid, conforming
    JSON)
  - `422` on empty prompt or out-of-range `max_tokens` (`[1, 8192]`) /
    `temperature` (`[0, 2]`)
  - `400` on unknown engine
  - `503` if `llama-cpp` has no `LLM_MODEL_PATH` ("model not configured"), or the
    `gen` extra is not installed in this venv

> **Quirk:** curl `127.0.0.1`, not `localhost` — the `::1` (IPv6) resolution can
> hang on Windows.

Example:

```bash
curl -X POST 127.0.0.1:8007/llm/generate \
  -H 'content-type: application/json' \
  -d '{"prompt":"Say hi","engine":"fake"}'
```

## Config (env / `.env`)

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `8007` | service port |
| `LLM_ENGINE` | `llama-cpp` | default engine when body `engine` is absent |
| `LLM_MODEL_PATH` | — | local GGUF file for `llama-cpp` (air-gapped; required for real gen) |
| `N_GPU_LAYERS` | `0` | layers offloaded to GPU (`0` = CPU) |
| `N_CTX` | `4096` | context window of the loaded model |

## Tests

Model-free by design: registry + HTTP contract + schema handling are covered
without any inference stack (the `fake` engine is deterministic pure-stdlib).
Real inference is opt-in: `LLM_REAL=1` with `LLM_MODEL_PATH` set to a local GGUF
— CI never sets it, the `gen` extra is not installed there.
