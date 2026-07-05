# capsule-voice

Stateless TTS capability service (ADR 065/067). Extracted from `backend/learn`
per ADR 067 D1 — one capability, no DB, port **:8001**. Dev runs on Windows,
prod target is Docker/Linux — no platform-specific engines.

Pluggable engines behind a `TTSEngine` Protocol + lazy registry, per-request
A/B via `?engine=`. Three engines covering the latency↔quality spectrum, all
commercial-friendly (MIT / Apache) and library-not-service (ADR 065):

| Engine | License | Niche | Local | Cloning | Warm synth (CPU, short phrase) |
|---|---|---|---|---|---|
| `piper` | MIT | fastest start, small ONNX models, CPU realtime | ✅ | ❌ | **~0.1s** |
| `kokoro` | Apache-2.0 | fast + good quality, CPU-friendly | ✅ | ❌ | ~0.6s |
| `chatterbox` | MIT | high quality + voice cloning (Resemble AI) | ✅ | ✅ | ~8-24s |

Timings measured 2026-07-03 on a dev CPU box; ranges = isolated vs all models
loaded at once (RAM pressure). First request per engine additionally downloads
its model from Hugging Face (piper ~60MB seconds; kokoro ~330MB;
chatterbox — GBs, minutes) — cached afterwards.

Evaluated and rejected: **F5-TTS** (CC-BY-NC non-commercial license — dropped
2026-07-04, precedent ADR 065), **edge-tts** (Microsoft cloud service —
violates library-not-service canon, no air-gap — dropped 2026-07-04),
**Coqui XTTS-v2** (CPML non-commercial license + conflicts with chatterbox's
`transformers` pin — dropped 2026-07-03 in favor of chatterbox, MIT + same
cloning niche), **StyleTTS2** (broken pip wrapper, ADR 065), **pyttsx3/SAPI**
(OS-voice bindings, prod is Docker — needs espeak-ng there and piper beats it
anyway), **Zonos / CSM / Orpheus** (CUDA/Linux-only setups), **MeloTTS**
(git-only install + mecab system deps), **Bark** (slow, unstable output),
**OpenVoice** (tone converter, not a TTS).

## Why Python 3.11

The SOTA TTS ecosystem (Chatterbox, StyleTTS2, XTTS) ships wheels for
3.10/3.11 only (ADR 065 §3). Kokoro is the exception. Pinning 3.11
(`.python-version` + `requires-python = ">=3.11,<3.12"`) opens the whole
stack.

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

Engines are **opt-in extras** (heavy stacks, lazy-imported — the base service
and CI never load them): `voice-piper`, `voice-kokoro`, `voice-chatterbox`.

```bash
uv sync --extra dev --extra voice-kokoro --extra voice-piper `
  --extra voice-chatterbox                        # everything
```

nx targets: `nx run backend-voice:serve|test:py|lint:py`.

## API (ADR 067 D2 — fixed contract)

- `GET /health` → `{"status":"ok"}`
- `GET /voice/engines` → `{"engines":[...],"default":"kokoro"}`
- `GET /voice/speak?text=&engine=&lang=&voice=&speed=&kind=` → `audio/wav`
  (400 on empty text / unknown engine, 503 if the engine's extra is not
  installed in this venv)
- `POST /voice/warm` → `{"generated":n,"skipped":m}` — pre-synthesize curated
  clips into the persistent tier (warm-at-ingest). Body:
  `{"texts":[{"text","lang?","voice?","speed?"}],"engines":[str],"kind":"words"|"phrases"}`.
  Idempotent (existing key → skip); one pair's failure never aborts the batch.

A/B from the front-end: the existing engine switcher just sets `?engine=`.

### Caching (three tiers)

`/voice/speak` is deterministic, so it's cached on three tiers:
- **HTTP**: `Cache-Control: public, max-age=86400` + `ETag` (sha256 of the
  canonical params `engine|lang|voice|speed|text|VOICE_MODEL_VERSION`, engine
  resolved after the `VOICE_ENGINE` default). `If-None-Match` revalidates to
  `304` without running synthesis.
- **Persistent (ADR 076)**: MinIO/S3 object store for **curated** synthesis —
  `?kind=words` / `?kind=phrases` are stored once (`voice/<kind>/<engine>/<sha>.wav`)
  and served forever. Best-effort: any storage error (MinIO down/timeout) logs
  a warning and falls through to LRU + synthesis — storage never 5xx's speak.
  The tier is **off** until `MINIO_ENDPOINT` is set.
- **Server**: in-memory LRU (512 entries ≈ 30MB) keyed by the same hash — a
  repeated phrase costs one synthesis per process lifetime, not one per
  request (measured: chatterbox 24s → 1.4ms on repeat). Holds `dynamic` (the
  default kind, never persisted). Synthesis errors are not cached.

`kind` is a **storage policy** (which tier persists), not part of the ETag —
the ETag is pure synthesis determinism. `dynamic` (default) → LRU only;
`words`/`phrases` → persist. Bumping `VOICE_MODEL_VERSION` invalidates both the
ETag and every storage key (a model/voice upgrade forces regeneration).

### Parameter semantics per engine

| Param | piper | kokoro | chatterbox |
|---|---|---|---|
| `voice` | voice id (`en_US-lessac-medium`) | voice name (`af_heart`, `am_adam`, `af_bella`) | **ref-clip path** (cloning) |
| `speed` | ✅ (length_scale) | ✅ | ❌ ignored |
| `lang` | via voice id | American English pipeline | English model |

## Config (env / `.env`)

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `8001` | service port |
| `VOICE_ENGINE` | `kokoro` | default engine when `?engine=` is absent |
| `DEFAULT_LANG` | `en_US` | default `lang` |
| `TORCH_DEVICE` | auto | `cuda`/`cpu` for torch engines (chatterbox) |
| `KOKORO_MODEL_PATH` | — | local model snapshot (air-gapped) |
| `PIPER_MODEL_PATH` | — | local `.onnx` voice, config `.onnx.json` next to it |
| `CHATTERBOX_MODEL_PATH` | — | local checkpoint dir (air-gapped, `from_local`) |
| `MINIO_ENDPOINT` | — | object store `host:port`; **unset → persist tier off** |
| `MINIO_BUCKET` | `voice` | bucket for stored clips (auto-created) |
| `MINIO_ACCESS_KEY` | — | object store access key |
| `MINIO_SECRET_KEY` | — | object store secret key |
| `MINIO_SECURE` | `false` | TLS to the object store |
| `VOICE_MODEL_VERSION` | `v1` | part of the synthesis hash — bump to invalidate all cached/stored audio |

**Air-gapped:** local engines download from Hugging Face by default — snapshot
the models and point the `*_MODEL_PATH` vars at local copies. All three engines
run fully offline once their models are local (no network-only engines in the
roster).

## Tests

Model-free by design: registry + HTTP contract are covered without any ML
stack (fake engine injected). Real-synthesis tests are opt-in:
`VOICE_REAL_ENGINES="kokoro,piper"` (or `all`) — CI never sets it, engine
extras are not installed there.
