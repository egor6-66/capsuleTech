---
name: backend-lang
owner-agent: owner-backend-lang
group: backend (python, not npm-released)
zone: backend
status: alpha
priority: P1
last-updated: 2026-07-03
---

# backend-lang (`capsule-lang`)

Sense-центричный lexical-граф (ADR 064) как самостоятельный capability-сервис (ADR 067 D1). Публичный HTTP-контракт `/lang/*`; `backend-learn` — композитор-потребитель, но не единственный.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `backend/lang/` (Python, FastAPI + SQLAlchemy + Alembic, тулчейн uv).
- **Status:** `alpha` — вынос из `backend/learn` завершён (копией, ADR 067 D1); контракт D2 работает, тесты зелёные.
- **Priority:** P1 — на нём будет сидеть learn-композитор + любые app'ы напрямую.
- **Maturity bar → beta:**
  - learn переведён на HTTP-потребление lang (такт owner-learn, бриф `backend-learn-compose.md`);
  - NLP-enrichment волна (wn/wordfreq — ADR 064 §enrichment);
  - CI job гоняет `test:py`+`lint:py` для backend-lang (зона architect).
- **Active blockers:** нет.
- **Roadmap:** enrichment (auto-rows поверх curated), sense_relations endpoints, Postgres smoke.
- **Last activity:** 2026-07-03 — founding extraction (бриф `backend-lang-extract.md`).

## Vendor stack

- **FastAPI** (`fastapi >=0.115`) — HTTP-слой. https://fastapi.tiangolo.com/
- **SQLAlchemy 2.0** (`sqlalchemy >=2.0`) — ORM, declarative Base. https://docs.sqlalchemy.org/
- **Alembic** (`alembic >=1.13`) — миграции (цепочка 0001→0002). https://alembic.sqlalchemy.org/
- **Pydantic v2** (`pydantic >=2.7`, `pydantic-settings`) — schemas + Settings. https://docs.pydantic.dev/
- **uv** — тулчейн (sync/lock/run). https://docs.astral.sh/uv/

## Зона ответственности

### Owns
- `backend/lang/` полностью: `src/capsule_lang/`, `tests/`, `alembic/`, `content/`, `pyproject.toml`, `project.json`, `uv.lock`.

### Не трогает
- `backend/learn/` (owner-learn) — даже «удалить перенесённое» — не наша зона.
- `backend/scriber/`, `backend/fs/` (owner-scriber / shared).
- `.github/` CI-workflows, root nx.json (architect).

## Публичный API (контракт ADR 067 D2 — не менять без ADR)

- `GET /health` → `{"status":"ok"}`.
- `GET /lang/senses` — фильтры `lang, pos, level, register, connotation, synset, domain, tier, tag[] (multi, AND), q` → `SensesResponse`.
- `GET /lang/sense/{sense_id}` → `SenseDetail` | 404.
- `GET /lang/senses/related?sense=&context=&limit=` → `RelatedResponse` (same-synset first, потом tag-overlap).

Формы ответов — `src/capsule_lang/schemas.py` (1:1 с learn на момент выноса). Ingestion-канон: YAML → `SenseIn` → двухпроходный идемпотентный upsert (`importer.py`, ADR 064-A A4).

## Quirks / gotchas

- **native_enum=False везде** (`models.py:_enum`) — string-valued enum-колонки ради drop-in SQLite→Postgres. Не включать native ENUM.
- **`register_` с underscore** в Pydantic-схемах (`schemas.py`) — `register` шадовит BaseModel; JSON-ключ остаётся `register` через alias.
- **Natural key sense = (word_id, coalesce(gloss,''))** (`importer.py:_upsert_sense`) — смена gloss в YAML создаёт НОВЫЙ sense, не апдейтит.
- **`q` ищет только по spelling** (word.text), не по gloss — осознанно (`repo.py:filter_senses`).
- **seed = importer на bundled corpus** (`content/en_US/seed.yml`); один ingestion-путь, без параллельных upsert'ов.
- **`python -m capsule_lang.seed` делает `create_all`** (dev-удобство без Alembic); прод-путь — `alembic upgrade head`.

## План рефакторинга / оптимизаций

- [ ] **NLP-enrichment** — wn/wordfreq auto-rows (ADR 064 §enrichment). (priority: medium)
- [ ] **sense_relations endpoints** — таблица определена, ручек нет. (priority: low)
- [x] **Founding extraction из backend/learn** — 2026-07-03, бриф `backend-lang-extract.md`.

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit/API | `tests/test_senses_api.py` | фильтры, detail, 404, seed-идемпотентность |
| Unit/API | `tests/test_related.py` | synset-first ranking, self-exclusion |
| Unit | `tests/test_importer.py` | идемпотентность, валидация, two-pass relations, enum-case |

**Перед изменением:** `uv run pytest` green. **Перед release:** contract D2 не ломать без ADR.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| `backend/learn` (композитор, HTTP-потребитель) | owner-learn |
| `backend/voice` (TTS capability, порт 8001) | owner-backend-voice |
| CI workflows / nx shared infra | architect |
