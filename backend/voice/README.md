# capsule-voice

Stateless TTS capability service (ADR 065/067). Extracted from `backend/learn`
per ADR 067 D1 — one capability, no DB, port **:8001**.

Pluggable engines behind a `TTSEngine` Protocol + lazy registry: **Kokoro**
(light, fast, CPU-friendly) and **Chatterbox** (Resemble AI, MIT — heavier,
voice cloning). Per-request A/B via `?engine=`.

## Why Python 3.11

The SOTA TTS ecosystem (Chatterbox, StyleTTS2, XTTS) ships wheels for
3.10/3.11 only (ADR 065 §3). Kokoro is the exception. Pinning 3.11
(`.python-version` + `requires-python = ">=3.11,<3.12"`) opens the whole
stack and lets us A/B Kokoro ↔ Chatterbox in one venv.

## Setup

Toolchain — [uv](https://docs.astral.sh/uv/) (`pip install uv`). All commands
from `backend/voice/`:

```bash
uv python install 3.11                       # once, if 3.11 is not installed
uv sync --extra dev                          # base service + dev tools (light, no ML)
uv run uvicorn capsule_voice.main:app --port 8001 --reload
uv run pytest                                # registry/contract tests, no models needed
uv run ruff check .
```

Engines are **opt-in extras** (heavy torch stack, lazy-imported — the base
service and CI never load them):

```bash
uv sync --extra dev --extra voice-kokoro                          # Kokoro only
uv sync --extra dev --extra voice-kokoro --extra voice-chatterbox # both (A/B)
```

nx targets: `nx run backend-voice:serve|test:py|lint:py`.

## API (ADR 067 D2 — fixed contract)

- `GET /health` → `{"status":"ok"}`
- `GET /voice/engines` → `{"engines":["chatterbox","kokoro"],"default":"kokoro"}`
- `GET /voice/speak?text=&engine=&lang=&voice=&speed=` → `audio/wav`
  (400 on empty text / unknown engine)

A/B from the front-end: the existing engine switcher just sets `?engine=` —
nothing else changes.

### Parameter semantics per engine

| Param | Kokoro | Chatterbox |
|---|---|---|
| `voice` | voice name (`af_heart`, `am_adam`, `af_bella`) | **path to a reference audio clip** (voice cloning); omit for the built-in default voice |
| `speed` | supported (0–4) | **ignored** — Chatterbox has no native speed control |
| `lang` | accepted, currently American English pipeline | accepted, English model |

## Engine notes (quality / speed)

- **Kokoro** — small model, loads in seconds, near-realtime synthesis on CPU
  (measured warm: **~0.5s** for a short phrase). Good default for interactive
  use.
- **Chatterbox** — full torch stack; **first request downloads the model from
  Hugging Face (~GBs) and load takes minutes on CPU** — that's expected, the
  model is then cached in-process. Warm synthesis on CPU: **~8s** for a short
  phrase (measured); CUDA recommended (`CHATTERBOX_DEVICE=cuda`, auto-detected
  when available). Quality: more natural prosody than Kokoro, plus voice
  cloning from a short reference clip.

## Config (env / `.env`)

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `8001` | service port |
| `VOICE_ENGINE` | `kokoro` | default engine when `?engine=` is absent |
| `DEFAULT_LANG` | `en_US` | default `lang` |
| `KOKORO_MODEL_PATH` | — | local model snapshot (air-gapped) |
| `CHATTERBOX_MODEL_PATH` | — | local checkpoint dir (air-gapped, `from_local`) |
| `CHATTERBOX_DEVICE` | auto | `cuda`/`cpu`; default = cuda if available |

**Air-gapped:** both engines download from Hugging Face by default. For
offline/prod, snapshot the models and point `KOKORO_MODEL_PATH` /
`CHATTERBOX_MODEL_PATH` at local copies.

## Tests

Model-free by design: registry + HTTP contract are covered without any ML
stack (fake engine injected). Real-synthesis tests are opt-in via env flags
(`VOICE_MODEL_AVAILABLE` for Kokoro, `VOICE_CHATTERBOX_AVAILABLE` for
Chatterbox) — CI never installs the engine extras.
