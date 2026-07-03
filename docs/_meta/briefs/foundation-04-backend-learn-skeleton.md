---
title: Foundation 04 — backend/learn/ skeleton (BFF, plugin-modules, orchestrator)
status: superseded # реализован иначе (learn iter 2, #438); композитор-роль → актуальный бриф backend-learn-compose.md (ADR 067)
audience: general-purpose agent (commit-only, без push)
last_updated: 2026-06-20
depends_on: [foundation-00, foundation-01, foundation-02, foundation-03]
unlocks: [foundation-06]
adr_refs: [055]
---

# Контекст

ADR 055 D1+D2+D3+D4: `backend/learn/` — BFF поверх runtime-сервисов. Plugin-pattern (`modules/lang/` обучение языкам, `modules/guides/` in-app tour'ы, в перспективе `code`/`arduino`). Orchestrator вызывает `voice`/`lang` через HTTP. Persistence через `capsule-data`. Curriculum — markdown с frontmatter, idempotent re-seed.

Этот бриф — **полный foundation-скелет**: каркас FastAPI + plugin-loader + два модуля (`lang` + `guides`) с mock-логикой + один пример концепта `articles.md` + работающий end-to-end mock-flow.

# Scope

Создать `backend/learn/` полностью. Реальные lesson DAGs, validators, recommender — последующие PR (выходят за foundation). Здесь — **связка работает, контент пустой**.

Работа **напрямую в `main`**. Без ветки. Commit-only **без push**.

# Структура

```
backend/learn/
├── pyproject.toml
├── uv.lock
├── project.json
├── README.md
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 0001_initial.py             ← progress + vocab_bookmarks + concept_meta tables
├── content/
│   └── lang/
│       └── en_US/
│           └── concepts/
│               └── articles.md          ← один пример (frontmatter + body, see шаблон ниже)
├── src/
│   └── capsule_learn/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py                    ← LEARN_PORT, DB_URL, VOICE_URL, LANG_URL, CONTENT_DIR
│       ├── core/
│       │   ├── __init__.py
│       │   ├── module_registry.py       ← register/load modules
│       │   ├── interfaces.py            ← LearnModule Protocol
│       │   ├── models.py                ← SQLAlchemy mapped classes: Concept, Progress, Bookmark
│       │   └── schemas.py               ← pydantic API schemas
│       ├── modules/
│       │   ├── __init__.py
│       │   ├── lang/
│       │   │   ├── __init__.py          ← регистрируется
│       │   │   ├── api.py               ← роутер /learn/lang/*
│       │   │   ├── curriculum.py        ← load_concepts() ← из content/lang/<code>/
│       │   │   ├── exercises.py         ← generator (stub)
│       │   │   ├── validator.py         ← check_answer(answer, exercise) → calls lang via orchestrator
│       │   │   ├── recommender.py       ← Leitner-stub (next_concept)
│       │   │   └── progress.py          ← update/read progress
│       │   └── guides/
│       │       ├── __init__.py
│       │       ├── api.py               ← роутер /learn/guides/*
│       │       ├── ingest.py            ← receive curriculum payload from app
│       │       ├── tour_engine.py       ← step→step FSM (stub)
│       │       └── progress.py
│       ├── services/
│       │   ├── __init__.py
│       │   ├── orchestrator.py          ← HTTP-клиент к voice/lang (httpx)
│       │   ├── content_loader.py        ← markdown → upsert в БД (idempotent)
│       │   ├── auth.py                  ← opt-in placeholder; MVP → SingleUserAuth
│       │   └── db.py                    ← engine + sessionmaker через capsule-data
│       └── api/
│           ├── __init__.py
│           ├── health.py
│           └── modules.py               ← GET /modules → registered list
└── tests/
    ├── conftest.py
    ├── test_health.py
    ├── test_modules_registry.py
    ├── test_lang_api.py                 ← /lessons, /concept/{id}, /exercise/check (mock validator)
    ├── test_guides_api.py               ← /ingest, /tour/start
    ├── test_orchestrator.py             ← мок voice/lang ответов через httpx-mock
    └── test_content_loader.py
```

# Контракты

## LearnModule (Protocol)

```python
from typing import Protocol
from fastapi import APIRouter


class LearnModule(Protocol):
    name: str  # "lang" | "guides" | ...

    def router(self) -> APIRouter: ...
    def on_startup(self) -> None: ...  # bootstrap (content load, etc.)
```

## API эндпоинты

**Core:**
- `GET /health` → `{ status: "ok" }`
- `GET /modules` → `{ registered: ["lang", "guides"] }`

**Module: lang**
- `GET /learn/lang/lessons?lang=en_US` → `{ concepts: [{ id, title, prerequisites }] }`
- `GET /learn/lang/concept/{id}` → `{ id, title, ts_analogy, body, examples, exercises }`
- `POST /learn/lang/exercise/check` `{ exerciseId, answer }` → `{ correct, hint, lessonTag }` (mock через orchestrator → lang.pos)
- `GET /learn/lang/progress?user=default` → `{ concepts: [{ id, box, last_reviewed }] }`

**Module: guides**
- `POST /learn/guides/ingest` `{ appId, curriculum }` → `{ guideId }`
- `POST /learn/guides/tour/start` `{ guideId, user }` → `{ steps, current: 0 }`
- `POST /learn/guides/tour/next` `{ tourId }` → `{ current, total, step }`

## Orchestrator

```python
import httpx
from capsule_learn.config import settings


class Orchestrator:
    def __init__(self):
        self.voice = httpx.AsyncClient(base_url=settings.VOICE_URL, timeout=30)
        self.lang = httpx.AsyncClient(base_url=settings.LANG_URL, timeout=30)

    async def lang_pos(self, text: str, lang: str) -> dict:
        r = await self.lang.post("/pos", json={"text": text, "lang": lang})
        r.raise_for_status()
        return r.json()

    async def voice_score(self, audio: bytes, expected_text: str) -> dict:
        # ...
```

Использовать в `lang/validator.py`: `await orchestrator.lang_pos(answer, "en_US")` → возвращать mock-verdict.

## Content loader

`load_concepts(content_dir)` — рекурсивно по `content/lang/<code>/concepts/*.md`:
1. Парсить frontmatter (`python-frontmatter`).
2. Body — оставить как plain markdown (без рендера на бэке — рендер на фронте).
3. Upsert в БД по `id` из frontmatter (table `concept_meta` — id PK, title, body, exercises_json, lang).

Вызывается на app startup. **Не трогает** `progress`/`bookmarks` таблицы.

## Пример `content/lang/en_US/concepts/articles.md`

```markdown
---
id: lang.en_US.articles
title: "Articles: a vs the"
ts_analogy: "new vs reference"
prerequisites: []
exercises:
  - { type: fill-blank, prompt: "I saw ___ dog.", answer: "a" }
  - { type: fill-blank, prompt: "___ dog barked.", answer: "The" }
lang: en_US
---

`a` = инстанцирование нового объекта (`new`).
`the` = ссылка на уже объявленный (`reference`).

```ts
const dog = introduce("dog"); // a dog
reference(dog);               // the dog
```
```

# pyproject.toml

```toml
[project]
name = "capsule-learn"
version = "0.0.0"
description = "Capsule learning BFF service."
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "pydantic>=2.0",
    "pydantic-settings>=2.0",
    "httpx>=0.27",
    "python-frontmatter>=1.1",
    "capsule-data",
]

[tool.uv.sources]
capsule-data = { path = "../../packages/shared/data/py", editable = true }

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-asyncio>=0.23", "respx>=0.21", "ruff>=0.5", "mypy>=1.10"]

[tool.uv]
dev-dependencies = ["pytest", "pytest-asyncio", "respx", "ruff", "mypy"]
```

# project.json

Аналогично voice/lang. Имя: `capsule-learn`. Default port: **8003**.

# Тесты

- **Health/modules** — базовая регистрация работает.
- **Lang API** — GET /lessons возвращает {} на пустом content (или 1 концепт если seeding отработал на test DB).
- **Validator** — мокаем lang через respx, проверяем что orchestrator зовётся.
- **Content loader** — temp dir с тестовым .md, upsert в in-memory SQLite, idempotency (повторный запуск не плодит дубли).

# Acceptance

- `nx run capsule-learn:install` — OK.
- `nx run capsule-learn:test:py` — зелёные.
- `nx run capsule-learn:lint:py` — без ошибок.
- `nx run capsule-learn:serve` — :8003.
- При воркающих `capsule-voice` (:8001) и `capsule-lang` (:8002):
  - `curl POST http://localhost:8003/learn/lang/exercise/check -d '{"exerciseId":"X","answer":"a"}'` — успешный ответ (mock), и в логах виден вызов `http://localhost:8002/pos`.
- `alembic upgrade head` — миграции применяются на SQLite.

# Что НЕ делаем

- Реальный Leitner-recommender — stub возвращает next в порядке prerequisites.
- Реальный exercise generator — hardcoded `articles.md` exercise[0..1].
- Реальный validator — stub возвращает `correct: answer == "a" or answer == "the"`.
- `code`/`arduino` модули — НЕТ. Пустые папки `modules/code/`, `modules/arduino/` с README "coming".
- Аутентификация — `SingleUserAuth` (всегда user="default"). Middleware-гнездо в `services/auth.py`, но `LEARN_AUTH=none`.
- Tour-engine реальный (DAG, conditionals) — stub: sequential step++.
- Docker, deployment — НЕТ.

# Дальше

После мержа web/learn (foundation-05) + apps/learn (foundation-06) можно поднять полный стек и пройти первый сценарий: открыть concept → запустить exercise → проверка через learn → orchestrator → lang.
