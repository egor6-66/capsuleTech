# backend/lang — `capsule-lang`

Sense-centric lexical graph as a standalone capability service (extracted from
`backend/learn` per **ADR 067 D1**). Data model: **ADR 064**; service shape:
**ADR 055**. Public contract — any app may call it directly; `backend-learn`
(the composer) is just one consumer.

- **Stack:** Python 3.12, [uv](https://docs.astral.sh/uv/), FastAPI, SQLAlchemy 2.0, Alembic, SQLite-file.
- **Port:** `8002` (voice 8001 / lang 8002 / learn 8003 — ADR 055).
- **DB:** `DATABASE_URL` (default `sqlite:///./lang.db`) — drop-in Postgres later.

## Run

```bash
uv sync --extra dev                                      # install deps
uv run alembic upgrade head                              # create schema (lang.db)
uv run python -m capsule_lang.seed                       # seed bundled corpus (idempotent)
uv run uvicorn capsule_lang.main:app --port 8002 --reload
```

`seed.py` is a thin wrapper around the importer on the bundled corpus
(`content/en_US/seed.yml`); the canonical way to feed lexicon is **YAML via the
importer** (`import_file` → `ImportReport`, ADR 064-A §A4) —
`uv run python -m capsule_lang.importer <file.yml>`.

```bash
uv run pytest          # tests (in-memory SQLite)
uv run ruff check .    # lint
```

### Env vars

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./lang.db` | SQLAlchemy URL; drop-in Postgres switch |
| `PORT` | `8002` | service port (ADR 055 allocation) |
| `DEFAULT_LANG` | `en_US` | default `lang` filter for `/lang/senses` |
| `LESSONS_VAULT` | *(unset)* | path to the teacher lessons vault for the importer; dev value `D:\learn\lang` (air-gapped: never baked into code) |

## Lessons content (ADR 069)

The learning content — **Concepts** (mindset prose), **Rules** (reference),
**Drills** (RU→EN practice items) and **Lessons** (ordered routes stitching the
three) — lives in the same DB as the lexical graph. A drill joins the dictionary
through `drill_words` (each `words[]` lemma resolves to a `words` row).

Content is authored as markdown-with-frontmatter in the teacher vault and pulled
in by the **lessons importer** (`id` == filename stem, kebab, forever — rule №0):

```bash
# either pass the vault path explicitly …
uv run python -m capsule_lang.lessons_importer D:\learn\lang
# … or set LESSONS_VAULT and run without an argument
LESSONS_VAULT=D:\learn\lang uv run python -m capsule_lang.lessons_importer
```

Folders scanned (finalочка mapping): `lessons/` (Lesson), `lessons/concepts/`
(Concept), `drills/` (Drill), `grammar|phonetics|speech/` (Rule).
`methods/ briefs/ journal/` (and any unlisted folder) are ignored.

Validation is **reject-with-reason** (never a silent skip): id == filename +
kebab (no `temp/wip/new`); every drill item must carry a time marker in
`promptRu` or a `context`; `words[]` must already exist in the dictionary; all
references (`rule`, `concepts`, `rules`, `drills`, `relatedRules`,
`relatedConcepts`) must resolve; `nearMiss.match ∈ {contains, regex}` and any
`regex` must compile. The run prints `imported/updated/rejected` with the reason
per rejected file. Import is idempotent (upsert by id).

> Образ (ADR 069 D4): `senses.image` and `sense_relations.bridge` ready the
> image conveyor — the columns and the ingestion path exist; no data yet.

## Endpoints (ADR 067 D2 contract)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |
| GET | `/lang/senses` | facet + tag filter (`lang`,`pos`,`level`,`register`,`connotation`,`synset`,`domain`,`tier`,`tag`*,`q`) |
| GET | `/lang/sense/{id}` | rich sense detail + tags + examples + relations |
| GET | `/lang/senses/related?sense={id}` | synset-aware ranking (same synset first, then shared tags) |
| GET | `/lang/lessons` | lesson list `{id,title,level,tags}` sorted by (level, title) |
| GET | `/lang/lessons/{id}` | lesson composition: intro + ordered full concepts/rules/drills |
| GET | `/lang/drills/{id}` | drill with its ordered items (`nearMiss` included) |
| GET | `/lang/concepts/{id}` | concept prose + examples + related refs |

`tag` repeats → AND (sense must carry all). `related` accepts `context` (tag name
weighted first) and `limit`.

`q` is script-aware: Latin input searches the spelling (`word.text`); Cyrillic
input searches `gloss` — the teacher corpus keeps the ru translation there
(ADR 064-A), so typing «много» finds *a lot / many*. English-headword corpus
is the current scope; other headword scripts would need a revisit.

## Model (ADR 064 + 064-A)

Atomic unit is **Sense** (a meaning), not Word. Single-valued facets → columns
(`pos/level/register/frequency` + rich: `pron_ru/ipa/image/connotation/intensity/
synset/forms/collocations/nuance/valency`); multi-valued → tags. Tag taxonomy v2:
`field/domain/tier/phonetic/lexical`. Tables: `words` · `senses` · `tags` ·
`sense_tags` (M2M) · `sense_examples` (1:N, first-class) · `sense_relations`
(defined, no endpoints yet). `source: auto|curated` — re-import never overwrites
curated rows.
