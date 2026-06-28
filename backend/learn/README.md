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

`tag` repeats → AND (sense must carry all). `related` accepts `context` (tag name
weighted first) and `limit`.

## Model (ADR 064 + 064-A)

Atomic unit is **Sense** (a meaning), not Word. Single-valued facets → columns
(`pos/level/register/frequency` + rich: `pron_ru/ipa/image/connotation/intensity/
synset/forms/collocations/nuance/valency`); multi-valued → tags. Tag taxonomy v2:
`field/domain/tier/phonetic/lexical`. Tables: `words` · `senses` · `tags` ·
`sense_tags` (M2M) · `sense_examples` (1:N, first-class) · `sense_relations`
(defined, no endpoints yet). `source: auto|curated` — re-import never overwrites
curated rows.
