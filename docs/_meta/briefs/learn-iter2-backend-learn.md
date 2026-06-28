---
title: Learn Iter 2 (library-1) — backend/learn sense-centric lexical DB + filter endpoints
status: ready
audience: owner-сессия backend/learn (USER запускает; коллаборативно)
last_updated: 2026-06-28
adr_refs: [064, 055, 054]
---

# Кто ты и как запуститься

Owner-сессия зоны **`backend/learn`** (`backend-learn`) — первый Python/FastAPI-сервис монорепо. Запуск: **`.\claude-scope.ps1 -Scope backend-learn`** — ты зафенсен в `backend/learn` (правки в `packages/*` и чужие зоны режутся хуком `governance.mjs`), git **commit-only** (push/merge недоступны — нет main-маркера). Твой канон — `backend/learn/OWNERSHIP.md` + **ADR 064** (модель данных) + этот бриф.

**Ownership-gate:** перед первой правкой хук требует **Read `backend/learn/OWNERSHIP.md`** — сделай это первым действием, иначе правки режутся.

**Git:** commit-only, без push (push/PR соберёт architect после совместной проверки). Без topic-веток. Хук блокнул — **STOP + escalate**, не обходи.

**Прочитай ПЕРВЫМ:** `backend/learn/OWNERSHIP.md`, `docs/01-architecture/adr/064-learn-lexical-graph-data-model.md` (§start-schema + §decision — там вся модель).

# Цель итерации

Поднять рабочий срез: **sense-центричная lexical-БД + filter/related endpoints**, заполнить парой слов, **отдать USER на тест в Postman**. Реализация коллаборативная (USER ведёт). Минимум-до-Postman, но **схема — полная и расширяемая** (ADR 064), ломать потом не должны.

# Стек / запуск

Python 3.12, **uv**, FastAPI, SQLAlchemy 2.0, Alembic, SQLite-файл. Port **8003**.
- deps: `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `sqlalchemy>=2.0`, `alembic`; dev: `pytest`, `httpx`/`pytest-asyncio`, `ruff`, `mypy`.
- run: `uv run alembic upgrade head` → `uv run python -m capsule_learn.seed` → `uv run uvicorn capsule_learn.main:app --port 8003 --reload`.
- test: `uv run pytest`.
- `config.py` читает `DATABASE_URL` (default `sqlite:///./learn.db`) — drop-in Postgres позже.

# Структура

```
backend/learn/
├── pyproject.toml            (uv; deps выше; [project.scripts] опц.)
├── project.json             (УЖЕ создан architect'ом: name=backend-learn, targets пустые — допиши nx run-commands serve/test:py/lint:py; локально гоняем uv напрямую)
├── README.md                (как поднять + порт + ссылка на ADR 064)
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/0001_lexical_schema.py
└── src/capsule_learn/
    ├── __init__.py
    ├── main.py              (FastAPI app; include health + lang router)
    ├── config.py            (Settings: DATABASE_URL, PORT=8003)
    ├── db.py                (engine + sessionmaker; SQLAlchemy 2.0 declarative Base)
    ├── enums.py             (Pos, Level, Register, TagKind, RelationType, Source)
    ├── models.py            (Word, Sense, Tag, SenseTag, SenseRelation)
    ├── schemas.py           (pydantic response-модели)
    ├── seed.py              (idempotent seed — пара слов)
    └── modules/
        └── lang/            (plugin-модуль; следующий модуль guides — отдельной папкой, ADR 055 D1)
            ├── __init__.py
            ├── api.py       (router /learn/lang/*)
            └── repo.py      (запросы: facet+tag filter, sense detail, related-by-shared-tags)
└── tests/
    ├── conftest.py          (in-memory SQLite fixture + seed)
    ├── test_senses_api.py
    └── test_related.py
```

> Plugin-registry (core/module_registry из ADR 055 D1) пока НЕ делаем — `main.py` инклудит lang-router напрямую, папка `modules/lang/` фиксирует plugin-намерение. Registry заведём при 2-м модуле.

# Схема БД (ADR 064 §start-schema)

## enums.py
- `Pos`: noun, verb, adj, adv, pron, prep, conj, det, interj
- `Level`: a1, a2, b1, b2, c1, c2  (CEFR — **сверь с англ-агентом/USER**, можно скорректировать вокабуляр)
- `Register`: formal, informal, neutral
- `TagKind`: semantic, lexical, context, domain, phonetic
- `RelationType`: antonym, hypernym, hyponym, part_of, member_of
- `Source`: auto, curated

## Таблицы (models.py)
| Таблица | Колонки | Заметки |
|---|---|---|
| `words` | id PK · text · lang | unique(text, lang) |
| `senses` | id PK · word_id→words · gloss(nullable) · pos(Pos) · level(Level,null) · register(Register,null) · frequency(int,null) · lang · source(Source) | **атомарная единица**; фасеты-колонки |
| `tags` | id PK · name · kind(TagKind) | unique(name, kind) |
| `sense_tags` | sense_id→senses · tag_id→tags | **PK(sense_id, tag_id)** + index(tag_id, sense_id) — M2M, ось фильтра/ранжирования |
| `sense_relations` | id PK · from_sense_id→senses · to_sense_id→senses · type(RelationType) · source(Source) | **DEFINED, endpoints НЕ делаем** (типизированный граф — следующая итерация) |

**Принципы (ADR 064):** single-valued фасет → колонка (pos/level/register/frequency); multi-valued → тег (domain/context/phonetic). Синонимы = общий `semantic`-тег (НЕ дублируем в relations). `source` отделяет auto от curated (re-seed не трёт curated).

# Endpoints (lang) — Postman-контракт

### `GET /health` → `{ "status": "ok" }`

### `GET /learn/lang/senses` — фасетный + теговый фильтр
Query (все опциональны, AND): `lang`(default en_US) · `pos` · `level` · `register` · `domain`(tag kind=domain) · `tag`(имя тега, можно несколько → AND, sense имеет все) · `q`(substring по word.text/gloss).
Логика: фасет-колонки → WHERE; tag/domain → JOIN `sense_tags` (несколько тегов = sense содержит ВСЕ).
Ответ:
```json
{ "senses": [
  { "id": 2, "text": "bank", "gloss": "financial institution",
    "pos": "noun", "level": "a2", "register": "neutral", "frequency": 1200,
    "tags": [{ "name": "finance", "kind": "domain" }, { "name": "institution", "kind": "semantic" }] }
] }
```

### `GET /learn/lang/sense/{id}` — деталь
Ответ: `{ id, word: { text, lang }, gloss, pos, level, register, frequency, source, tags: [{name,kind}] }`.

### `GET /learn/lang/senses/related?sense={id}&context={tagName?}&limit=20` — контекстный свап (ядро)
Логика: найти senses, делящие ≥1 тег с данным (исключая сам), `ORDER BY COUNT(общих тегов) DESC`. Если задан `context` — senses с этим тегом идут первыми (доп.вес/вторичная сортировка). На том же языке.
Ответ:
```json
{ "related": [
  { "id": 4, "text": "glad", "gloss": "...", "sharedTags": 2,
    "tags": [{ "name": "synset-glad", "kind": "semantic" }, { "name": "emotion", "kind": "context" }] }
] }
```

# Seed (idempotent, по натуральному ключу; source=curated)

Пара слов, чтобы протестить фильтр + related-ранжирование:
- `bank` → sense#1 «land beside a river» (noun, b1, tags: domain=nature, semantic=geography); sense#2 «financial institution» (noun, a2, tags: domain=finance, semantic=institution) — **полисемия** для фильтра по domain.
- `happy` (adj, a1, tags: semantic=synset-glad, context=emotion)
- `glad` (adj, a2, tags: semantic=synset-glad, context=emotion)
- `joyful` (adj, b1, tags: semantic=synset-glad, context=emotion)

→ `related(happy)` вернёт glad+joyful (по 2 общих тега); `senses?domain=finance` → только bank#2; `senses?pos=adj` → happy/glad/joyful. Upsert: words by (text,lang), tags by (name,kind), senses by (word_id, gloss). Повтор seed не плодит дубли.

# Тесты (pytest, in-memory SQLite)
- `test_health`
- `test_senses_filter` — domain=finance → bank#2; pos=adj → 3 senses; tag=synset-glad → 3.
- `test_sense_detail` — sense + теги.
- `test_related` — related(happy) = {glad, joyful}, отсортировано по sharedTags.
- `test_seed_idempotent` — двойной seed, счётчики стабильны.

# Acceptance (прогнать; last-lines → architect)
- `uv sync` ок.
- `uv run alembic upgrade head` на SQLite ок (создаёт 5 таблиц).
- `uv run python -m capsule_learn.seed` наполняет; повтор — без дублей.
- `uv run uvicorn ... --port 8003` → `GET /health` 200.
- Все 3 endpoint'а отдают контракт выше (проверь curl'ом перед отдачей USER).
- `uv run pytest` зелёные.

# Что НЕ делаем (iter library-1)
- `sense_relations` endpoints (только таблица), `synset`-сущность.
- song/construction/exercise + backlinks, пер-юзер слой.
- `packages/shared/data` извлечение (БД-слой пока в backend/learn).
- NLP-обогащение (auto-POS/phonetics), guides-модуль, plugin-registry.
- Auth (single-user), Postgres, Docker.
- nx.json namedInputs / CI Python-job / root-config — это **architect** на этапе интеграции.

# После того как заработает
USER гоняет Postman → если ок, маякнёт architect'у → совместная проверка → architect добавит nx/CI-инфру (foundation-00) + соберёт кросс-PR. Дальше — следующий план (`sense_relations` endpoints / фронт-library через web-query).
