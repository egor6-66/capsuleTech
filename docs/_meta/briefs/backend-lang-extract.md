---
title: backend/lang — вынос lexical-движка из backend/learn (capability-сервис)
status: ready
audience: owner-сессия `claude-scope -Scope backend-lang` (commit-only, без push)
last_updated: 2026-07-03
adr_refs: [054, 055, 064, 067]
supersedes: [foundation-01-shared-data, foundation-03-backend-lang-skeleton]
---

# Контекст

ADR 067 D1: lexical-граф (ADR 064) уезжает из `backend/learn` в самостоятельный capability-сервис **`backend/lang`** (`backend-lang`, порт **:8002**). Learn останется композитором и будет ходить сюда по HTTP; но lang — публичный сервис, его контракт самодостаточен (любой апп может ходить напрямую).

Это **вынос копией**: `backend/learn` в этом брифе **НЕ трогаем вообще** (его чистит owner-learn отдельным тактом, бриф `backend-learn-compose.md`). Читать чужую зону можно, писать — нет.

`backend/lang/project.json` уже создан (bootstrap main). Python 3.12+ (как learn), тулчейн uv.

# Scope

Собрать `backend/lang` как рабочий сервис, перенеся из `backend/learn` (копией, с переименованием пакета `capsule_learn` → `capsule_lang`):

| Из learn | В lang |
|---|---|
| `src/capsule_learn/models.py`, `enums.py`, `schemas.py`, `db.py` | `src/capsule_lang/…` |
| `src/capsule_learn/modules/lang/{api,repo}.py` | `src/capsule_lang/api.py` + `repo.py` (модульная обёртка `modules/` больше не нужна — сервис и есть lang) |
| `src/capsule_learn/importer.py`, `seed.py` | `src/capsule_lang/…` |
| `alembic/` + `alembic.ini` (миграции 0001, 0002) | `alembic/` (та же цепочка; БД новая — `lang.db`) |
| `content/lang/en_US/seed.yml` | `content/en_US/seed.yml` (уровень `lang/` в пути схлопывается — сервис уже lang) |
| `tests/{conftest,test_importer,test_related,test_senses_api}.py` | `tests/…` |
| `pyproject.toml`, `.gitignore`, `README.md` | адаптировать (см. ниже) |

**НЕ переносим:** `modules/voice/` (зона backend-voice), `test_voice.py`, voice-поля из `config.py`, voice-extras из pyproject.

# Контракт (ADR 067 D2 — зафиксирован, не менять)

Prefix роутера **`/lang`** (не `/learn/lang`):

- `GET /lang/senses` — фильтры `lang, pos, level, register, connotation, synset, domain, tier, tag[] (multi), q` → `SensesResponse`. Формы ответов — 1:1 текущие schemas learn.
- `GET /lang/sense/{sense_id}` → `SenseDetail` | 404.
- `GET /lang/senses/related?sense=&context=&limit=` → `RelatedResponse`.
- `GET /health` → `{"status":"ok"}`.

# Детали

- **pyproject:** `name = "capsule-lang"`, description про lexical-graph (ADR 064/067), deps как у learn МИНУС voice-extras (fastapi, uvicorn, pydantic, pydantic-settings, sqlalchemy, alembic, pyyaml; dev: pytest, pytest-asyncio, httpx, ruff, mypy). Свой `uv.lock` (`uv sync --extra dev`).
- **config.py:** `database_url = "sqlite:///./lang.db"`, `port = 8002`, `default_lang = "en_US"`. Без voice-полей. Комментарий drop-in Postgres сохранить.
- **main.py:** `FastAPI(title="capsule-lang")` + `/health` + include lang-роутера.
- **seed/importer:** пути к `content/` поправить под новую структуру; сид остаётся идемпотентным. Teacher-vocab `docs/_meta/briefs/learn-vocab/` — проверить, что importer-формат не задет переносом (сами yml-файлы не трогать).
- **project.json:** добавить targets `serve` (`uv run uvicorn capsule_lang.main:app --port 8002 --reload`), `migrate`, `seed`, `import`, `test:py`, `lint:py` — зеркало backend-learn (cwd `backend/lang`).
- **alembic:** цепочка миграций переезжает как есть (история валидна для новой БД); `alembic.ini`/`env.py` — пути и импорты на `capsule_lang`.
- **OWNERSHIP.md** — создать (шаблон `docs/_meta/OWNERSHIP-template.md`): зона, публичный контракт D2, quirks (native_enum=False, drop-in Postgres), coverage.
- **README.md** — как поднять (uv sync / migrate / seed / serve), env vars.

# Git

Работа в main tree, **commit-only, без push/веток** (fence + git-gate). Коммитить ТОЛЬКО свои пути (`backend/lang/**` + свой бриф-статус если попросят). Scope-тег в сообщении: `feat(backend-lang): ...`. Кириллица в сообщении → `git commit -F <file>`.

# Acceptance

1. `uv sync --extra dev` — чисто, `uv.lock` закоммичен.
2. `uv run alembic upgrade head` → `lang.db` создан.
3. `uv run python -m capsule_lang.seed` — идемпотентно (второй прогон без дублей).
4. `uv run pytest` — все зелёные (перенесённые 3 теста + conftest адаптированы).
5. `uv run ruff check .` — 0.
6. `uv run uvicorn capsule_lang.main:app --port 8002` → `curl :8002/health` ok; `curl ":8002/lang/senses?q=bank"` отдаёт bank-полисемию из сида; `curl ":8002/lang/senses/related?sense=<id>"` отдаёт ранкинг.
7. В `backend/learn` — **ноль изменений** (`git status` не показывает learn-путей).

# Что НЕ делаем

- НЕ трогаем `backend/learn` (даже «заодно удалить перенесённое» — это такт owner-learn).
- НЕ NLP-enrichment (wn/wordfreq/embeddings — ADR 064 §enrichment, отдельная волна).
- НЕ Postgres, не Docker, не auth.
- CI-workflow (`.github/`) — зона architect, не трогать.
