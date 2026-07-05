# capsule-image

Stateless text-to-image capability service (ADR 065/067) — the visual mirror of
`backend/voice`. One capability, no DB, port **:8005**. Generates PNGs for words
(word-as-image teacher). Dev runs on Windows, prod target is Docker/Linux.

Pluggable engines behind an `ImageEngine` Protocol + lazy registry, per-request
A/B via `?engine=`. Phase-1 engines:

| Engine | Niche | License | Default | Extra |
|---|---|---|---|---|
| `fake` | deterministic 1×1 PNG for CI (no ML) | — | — | built-in |
| `sdxl-turbo` | baseline, 1-4 steps, modest GPU | OpenRAIL++ | ✅ | `gen` |
| `flux-schnell` | higher quality, ~12GB+ VRAM | Apache 2.0 | ❌ | `gen` + `gen-flux` |

Rejected: **FLUX.1-dev** — non-commercial license (class of the rejected f5,
ADR 065). External image APIs (Midjourney / Stability / …) — deferred by the
user, would be separate future engines.

## Why Python 3.12

Unlike `backend/voice` (pinned 3.11 for the Chatterbox/XTTS wheel wall), the
diffusers/torch stack ships cp312 wheels — there is no 3.11 constraint here.
Pinned `>=3.12,<3.13` (`.python-version` + `requires-python`); `<3.13` only
because torch cp313 wheels lag.

## Setup

Toolchain — [uv](https://docs.astral.sh/uv/) (`pip install uv`). All commands
from `backend/image/`:

```bash
uv python install 3.12                       # once, if 3.12 is not installed
uv sync --extra dev                          # base service + dev tools (light, no ML)
uv run uvicorn capsule_image.main:app --port 8005 --reload
uv run pytest                                # registry/contract tests, no models needed
uv run ruff check .
```

Engines are **opt-in extras** (heavy torch stack, lazy-imported — the base
service, the `fake` engine and CI never load them):

```bash
uv sync --extra dev --extra gen                 # sdxl-turbo
uv sync --extra dev --extra gen --extra gen-flux  # + flux-schnell (T5 tokenizer deps)
```

nx targets: `nx run backend-image:serve|test:py|lint:py`.

## API (ADR 067 contract)

- `GET /health` → `{"status":"ok"}`
- `GET /image/engines` → `{"engines":["fake","flux-schnell","sdxl-turbo"],"default":"sdxl-turbo"}`
- `GET /image/render?prompt=&engine=&size=&seed=` → `image/png`
  - `422` on empty prompt or bad `size` (must be `WxH`, each dim in `[64, 2048]`)
  - `400` on unknown engine
  - `503` if the engine's extra is not installed in this venv

A/B from the front-end: the engine switcher just sets `?engine=`.

> **Quirk:** curl `127.0.0.1`, not `localhost` — the `::1` (IPv6) resolution can
> hang on Windows.

### Caching

`/image/render` is deterministic, so it's cached on two tiers:
- **HTTP**: `Cache-Control: public, max-age=86400` + `ETag` (sha256 of the
  canonical params `engine|size|seed|prompt`, engine resolved after the
  `IMAGE_ENGINE` default). `If-None-Match` revalidates to `304` without
  running generation.
- **Server**: **disk** cache — one PNG file per hash under `CACHE_DIR`. Unlike
  voice's in-memory LRU, this survives restarts: generation is expensive
  (seconds on GPU) and PNGs are large. Writes are atomic (temp + rename), so a
  crashed generation never leaves a truncated cache hit.

## Config (env / `.env`)

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `8005` | service port |
| `IMAGE_ENGINE` | `sdxl-turbo` | default engine when `?engine=` is absent |
| `DEFAULT_SIZE` | `512x512` | default `size` |
| `DEFAULT_SEED` | `0` | default `seed` |
| `CACHE_DIR` | `.cache/images` | disk cache directory |
| `TORCH_DEVICE` | auto | `cuda`/`cpu` for torch engines |
| `SDXL_MODEL_PATH` | — | local model snapshot / id override (air-gapped) |
| `FLUX_MODEL_PATH` | — | local model snapshot / id override (air-gapped) |

**Air-gapped:** torch engines download from Hugging Face by default — snapshot
the models and point the `*_MODEL_PATH` vars at local copies.

## Tests

Model-free by design: registry + HTTP contract + caching are covered without any
ML stack (the `fake` engine produces a deterministic pure-stdlib PNG). Real
generation tests are opt-in: `IMAGE_REAL_ENGINES="sdxl-turbo"` (or `all`) — CI
never sets it, engine extras are not installed there.
