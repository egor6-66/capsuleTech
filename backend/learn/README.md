# backend/learn — `capsule-learn`

First Python/FastAPI service in the monorepo. Sense-centric lexical library
(`lang` module). Data model: **ADR 064**; service shape: **ADR 055**.

- **Stack:** Python 3.12, [uv](https://docs.astral.sh/uv/), FastAPI, SQLAlchemy 2.0, Alembic, SQLite-file.
- **Port:** `8003` (voice 8001 / lang 8002 / learn 8003 — ADR 055).
- **DB:** `DATABASE_URL` (default `sqlite:///./learn.db`) — drop-in Postgres later.

## Run

```bash
uv sync                                                  # install deps
uv run alembic upgrade head                              # create schema
uv run python -m capsule_learn.importer content/lang/en_US/seed.yml   # ingest corpus
uv run uvicorn capsule_learn.main:app --port 8003 --reload
```

`seed.py` is a thin wrapper around the importer on the bundled corpus; the
canonical way to feed lexicon is **YAML via the importer** (`import_file` →
`ImportReport`, ADR 064-A §A4) — `python -m capsule_learn.importer <file.yml>`.

```bash
uv run pytest          # tests (in-memory SQLite)
uv run ruff check .    # lint
```

## Endpoints (Postman contract)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |
| GET | `/learn/lang/senses` | facet + tag filter (`lang`,`pos`,`level`,`register`,`connotation`,`synset`,`domain`,`tier`,`tag`*,`q`) |
| GET | `/learn/lang/sense/{id}` | rich sense detail + tags + examples + relations |
| GET | `/learn/lang/senses/related?sense={id}` | synset-aware ranking (same synset first, then shared tags) |
| GET | `/learn/voice/speak?text=&engine=&voice=&speed=` | TTS → `audio/wav` |
| GET | `/learn/voice/engines` | `{ engines: [...], default }` for the engine switcher |

`tag` repeats → AND (sense must carry all). `related` accepts `context` (tag name
weighted first) and `limit`.

## Voice (TTS)

Pluggable engine behind a `TTSEngine` Protocol + lazy registry
(`modules/voice/engine.py`) — swap per request via `?engine=` or globally via
`VOICE_ENGINE`. Engines install independently (opt-in extras, lazy-imported so
the base service/CI stay light):

```bash
uv sync --extra voice              # Kokoro (torch)
uv sync --extra voice-styletts2    # StyleTTS2  (also needs espeak-ng, see below)
uv run uvicorn capsule_learn.main:app --port 8003
curl "http://127.0.0.1:8003/learn/voice/speak?text=happy&engine=kokoro" -o k.wav
curl "http://127.0.0.1:8003/learn/voice/speak?text=happy&engine=styletts2" -o s.wav
```

Unknown `engine` → 400. Air-gapped: point `KOKORO_MODEL_PATH` at a local model
snapshot. **StyleTTS2 requires the espeak-ng system binary** (phonemizer →
espeak-ng); on Windows: `winget install eSpeak-NG.eSpeak-NG`. Without it,
StyleTTS2 synthesis raises at inference time (Kokoro is unaffected).

## Model (ADR 064 + 064-A)

Atomic unit is **Sense** (a meaning), not Word. Single-valued facets → columns
(`pos/level/register/frequency` + rich: `pron_ru/ipa/image/connotation/intensity/
synset/forms/collocations/nuance/valency`); multi-valued → tags. Tag taxonomy v2:
`field/domain/tier/phonetic/lexical`. Tables: `words` · `senses` · `tags` ·
`sense_tags` (M2M) · `sense_examples` (1:N, first-class) · `sense_relations`
(defined, no endpoints yet). `source: auto|curated` — re-import never overwrites
curated rows.
