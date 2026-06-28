# backend/learn — `capsule-learn`

First Python/FastAPI service in the monorepo. Sense-centric lexical library
(`lang` module). Data model: **ADR 064**; service shape: **ADR 055**.

- **Stack:** Python 3.12, [uv](https://docs.astral.sh/uv/), FastAPI, SQLAlchemy 2.0, Alembic, SQLite-file.
- **Port:** `8003` (voice 8001 / lang 8002 / learn 8003 — ADR 055).
- **DB:** `DATABASE_URL` (default `sqlite:///./learn.db`) — drop-in Postgres later.

## Run

```bash
uv sync                                                  # install deps
uv run alembic upgrade head                              # create schema (5 tables)
uv run python -m capsule_learn.seed                      # idempotent seed
uv run uvicorn capsule_learn.main:app --port 8003 --reload
```

```bash
uv run pytest          # tests (in-memory SQLite)
uv run ruff check .    # lint
```

## Endpoints (Postman contract)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |
| GET | `/learn/lang/senses` | facet + tag filter (`lang`,`pos`,`level`,`register`,`domain`,`tag`*,`q`) |
| GET | `/learn/lang/sense/{id}` | sense detail + tags |
| GET | `/learn/lang/senses/related?sense={id}` | senses ranked by shared-tag count |

`tag` repeats → AND (sense must carry all). `related` accepts `context` (tag name
weighted first) and `limit`.

## Model (ADR 064)

Atomic unit is **Sense** (a meaning), not Word. Single-valued facets → columns
(`pos/level/register/frequency`); multi-valued → tags (`domain/context/phonetic`).
Tables: `words` · `senses` · `tags` · `sense_tags` (M2M) · `sense_relations`
(defined, no endpoints this iteration). `source: auto|curated` — re-seed never
overwrites curated rows.
