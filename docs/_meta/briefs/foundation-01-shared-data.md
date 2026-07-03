---
title: Foundation 01 — packages/shared/data/ (core spec + Python adapter)
status: superseded # ADR 067 — не реализован; learn/lang сделаны на собственном SQLAlchemy-стеке, shared-data не появился
audience: owner-shared (commit-only, без push — push делает architect/user)
last_updated: 2026-06-20
depends_on: [foundation-00]
unlocks: [foundation-02, foundation-03, foundation-04]
adr_refs: [054, 055]
---

# Контекст

ADR 055 D3 — `packages/shared/data/` — первый **cross-language shared lib** capsule. Core-контракт + per-language адаптеры. Python adapter первый (нужен для backend/voice|lang|learn). Rust/TS — по востребованности, не сейчас.

ADR 054 (поправленный) явно говорит: shared может быть мульти-language через `core/` + `<lang>/` подпапки.

# Scope

Создать **только** `core/` (язык-агностичная спека) и `py/` (Python adapter). Никаких rs/ts adapters.

Работа **напрямую в `main`** (user сейчас в режиме рулит сам). Без отдельной ветки. Commit-only **без push** — push делает architect/user (memory `feedback_agents_commit_only_user_pushes`). `git-gate` режет `git switch` / `git push` — если хук сработал, STOP и эскалируй главному, не пытайся обойти.

# Структура

```
packages/shared/data/
├── README.md                      ← обзор lib, ссылки на core/ и py/
├── core/
│   ├── interfaces.md              ← Storage / Repo / Migration / Connection контракты
│   ├── migration-format.md        ← как описывается миграция (Alembic-совместимо)
│   ├── seed-format.md             ← как описывается seed-data
│   └── schemas/
│       └── .gitkeep
└── py/
    ├── pyproject.toml             ← uv-based, name="capsule-data"
    ├── uv.lock                    ← сгенерируется uv lock
    ├── project.json               ← nx targets test:py / lint:py / build:py
    ├── README.md
    ├── src/
    │   └── capsule_data/
    │       ├── __init__.py        ← public API export
    │       ├── engine.py          ← SQLAlchemy 2.0 engine factory
    │       ├── session.py         ← session factory + context manager
    │       ├── repo.py            ← Repo[T] generic (lightweight wrapper)
    │       ├── storage.py         ← Storage interface + LocalFsStorage impl
    │       ├── migrations.py      ← Alembic wrapper
    │       └── types.py           ← common types/aliases
    └── tests/
        ├── conftest.py            ← fixtures (in-memory SQLite engine, tmp_path storage)
        ├── test_engine.py
        ├── test_repo.py
        └── test_storage.py
```

# Точные контракты

## `core/interfaces.md`

Описать четыре интерфейса в language-agnostic виде (markdown, не код). Под каждый — методы + семантика + invariants:

- **Connection** — открыть/закрыть, transaction-scope.
- **Repo[T]** — `find(id)` / `find_by(filters)` / `save(entity)` / `delete(entity)` / `query(...)`. Generic по entity-type.
- **Storage** — `put(key, blob)` / `get(key) → blob` / `delete(key)` / `list(prefix) → keys` / `exists(key)`. Blob-абстракция (bytes-stream).
- **Migration** — `upgrade(target?)` / `downgrade(target)` / `current()` / `history()`. Совместима с Alembic-конвенциями (revision-ID, chain).

Каждый интерфейс в отдельной секции (`## Connection` и т.д.) с примером usage в pseudocode.

## `py/pyproject.toml`

```toml
[project]
name = "capsule-data"
version = "0.0.0"
description = "Capsule shared data layer (Python adapter): SQLAlchemy + Alembic + Storage."
requires-python = ">=3.12"
dependencies = [
    "sqlalchemy>=2.0",
    "alembic>=1.13",
    "pydantic>=2.0",
]

[project.optional-dependencies]
postgres = ["psycopg[binary]>=3.2"]
dev = ["pytest>=8.0", "pytest-asyncio>=0.23", "ruff>=0.5", "mypy>=1.10"]

[tool.uv]
dev-dependencies = ["pytest", "pytest-asyncio", "ruff", "mypy"]

[tool.ruff]
line-length = 100
target-version = "py312"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/capsule_data"]
```

## `py/project.json`

```jsonc
{
  "name": "capsule-data-py",
  "$schema": "../../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/shared/data/py/src",
  "projectType": "library",
  "targets": {
    "install": {
      "executor": "nx:run-commands",
      "options": {
        "command": "uv sync --all-extras",
        "cwd": "packages/shared/data/py"
      }
    },
    "test:py": {
      "executor": "nx:run-commands",
      "options": {
        "command": "uv run pytest -q",
        "cwd": "packages/shared/data/py"
      },
      "dependsOn": ["install"]
    },
    "lint:py": {
      "executor": "nx:run-commands",
      "options": {
        "command": "uv run ruff check . && uv run mypy src",
        "cwd": "packages/shared/data/py"
      },
      "dependsOn": ["install"]
    },
    "build:py": {
      "executor": "nx:run-commands",
      "options": {
        "command": "uv build",
        "cwd": "packages/shared/data/py"
      },
      "dependsOn": ["install"]
    }
  }
}
```

## `py/src/capsule_data/engine.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine


def make_engine(url: str, **kwargs) -> Engine:
    """
    Create SQLAlchemy engine. URL drives backend:
    - sqlite:///path/to/db.sqlite — file-based SQLite (zero-admin self-host)
    - sqlite:///:memory: — in-memory (tests)
    - postgresql+psycopg://user:pass@host/db — Postgres production
    """
    # SQLite per-connection isolation tweaks for FastAPI usage
    if url.startswith("sqlite"):
        kwargs.setdefault("connect_args", {"check_same_thread": False})
    return create_engine(url, **kwargs)
```

## `py/src/capsule_data/session.py`

Context-manager pattern над `sessionmaker`. `SessionFactory(engine)` → `with factory() as session:`.

## `py/src/capsule_data/repo.py`

Generic `Repo[T]` (T — SQLAlchemy mapped class). Методы: `find(id)`, `find_by(**filters)`, `list(**filters)`, `save(entity)`, `delete(entity)`. **Тонкая обёртка** над SQLAlchemy — не городим custom-DSL.

## `py/src/capsule_data/storage.py`

```python
from abc import ABC, abstractmethod
from pathlib import Path


class Storage(ABC):
    @abstractmethod
    def put(self, key: str, blob: bytes) -> None: ...

    @abstractmethod
    def get(self, key: str) -> bytes: ...

    @abstractmethod
    def delete(self, key: str) -> None: ...

    @abstractmethod
    def exists(self, key: str) -> bool: ...

    @abstractmethod
    def list(self, prefix: str = "") -> list[str]: ...


class LocalFsStorage(Storage):
    """Filesystem-backed Storage. Root is the base dir; keys are relative paths."""

    def __init__(self, root: str | Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    # impls...
```

## `py/src/capsule_data/migrations.py`

Wrapper над Alembic CLI: `upgrade("head")`, `downgrade("-1")`, `current()`, `history()`. Принимает path к alembic dir и engine URL.

## tests/

Минимум по 3-5 теста на каждый модуль. `conftest.py` даёт `engine` (in-memory SQLite) и `storage` (tmp_path) fixture'ы.

# Acceptance

- `pnpm exec nx run capsule-data-py:install` — успешно.
- `pnpm exec nx run capsule-data-py:test:py` — все тесты зелёные.
- `pnpm exec nx run capsule-data-py:lint:py` — ruff + mypy без ошибок.
- `pnpm exec nx graph` — проект виден.
- `pnpm exec nx affected -t test:py --files=packages/shared/data/py/src/capsule_data/engine.py` — запускает только `capsule-data-py:test:py`.

# Что НЕ делаем

- Custom-ORM DSL поверх SQLAlchemy — НЕТ. Тонкая обёртка.
- S3/cloud Storage — НЕТ. Только LocalFsStorage; интерфейс готов под расширение.
- Rust/TS adapters — НЕТ. Только `py/`.
- Связь с конкретными моделями learn/voice/lang — НЕТ. Lib не знает о consumer'ах.
- Не качаем модели данных bootstrap (фикстур) — это сделают consumer'ы со своими alembic-миграциями.

# Дальше

После мержа `backend/voice|lang|learn/` смогут добавить `"capsule-data @ file:../../packages/shared/data/py"` в свои `pyproject.toml`. Это разблокирует foundation-02..04.
