---
title: backend/learn — из lexical-хоста в композитор (httpx → lang/voice, чистка)
status: ready
audience: owner-сессия `claude-scope -Scope backend-learn` (commit-only, без push)
last_updated: 2026-07-03
adr_refs: [055, 064, 065, 067]
depends_on: [backend-lang-extract, backend-voice-extract]
supersedes: [foundation-04-backend-learn-skeleton]
---

# Контекст

ADR 067: lexical-движок уехал в `backend/lang` (:8002), TTS — в `backend/voice` (:8001). Learn (:8003) становится **композитором** (BFF, ADR 055 D2): его учебные выдачи собирают данные capability-сервисов в один payload — «слово + озвучка рядом». Сам лексической БД и движков больше не держит; **stateless** до появления user-состояния (прогресс/SRS — следующая волна, тогда заведём свою БД заново).

Контракты lang/voice зафиксированы в ADR 067 D2 — кодить можно параллельно тактy 1, но acceptance-smoke требует живых lang/voice.

# Scope

**Часть 1 — вырезать перенесённое:**
- `modules/lang/`, `modules/voice/` (+`modules/__init__.py` если пустеет), `models.py`, `enums.py`, `schemas.py` (лексические), `db.py`, `importer.py`, `seed.py`, `alembic/` + `alembic.ini`, `content/`, `learn.db`, тесты `test_importer/test_related/test_senses_api/test_voice`.
- pyproject: убрать sqlalchemy/alembic/pyyaml и voice-extras; из project.json — targets `migrate`/`seed`/`import`. Пересобрать `uv.lock`.
- config.py: убрать database_url и voice-поля; добавить D4-поля (ниже).
- Минор-долг заодно уходит сам: pydantic-поле `register`, шадоуившее BaseModel, жило в лексических schemas — проверить, что предупреждение исчезло.

**Часть 2 — композитор:**
- `clients/lang.py`, `clients/voice.py` — тонкие httpx-клиенты (async) по контрактам D2. Таймауты явные, ошибки апстрима → 502 с внятным detail (не silent-swallow, канон §0).
- **Фронт-контракт learn сохраняется**: `GET /learn/lang/senses`, `/learn/lang/sense/{id}`, `/learn/lang/senses/related` — та же форма ответов, внутри — вызов lang. Learn держит **свои** pydantic-модели ответов (копия форм lang + обогащение), не импортирует чужие.
- **Композиция озвучки (ADR 067 D2):** в `SenseListItem` и `SenseDetail` добавить блок

```json
"audio": { "url": "<VOICE_PUBLIC_URL>/voice/speak?text=<word.text>&lang=<lang>", "engines": [...] }
```

  — готовая ссылка на voice (URL-энкодинг text!), НЕ байты. `engines` — из `GET /voice/engines` (кэшировать в памяти с TTL/на старте — не дёргать voice на каждый sense). Если voice недоступен — `audio: null` + warning-лог (слово без озвучки полезнее 502).
- `/learn/voice/*` — **удалить** (фронт мигрирует на `audio.url` отдельным шагом, зона architect).

# Детали

- **config.py (D4):** `lang_url = "http://localhost:8002"`, `voice_url = "http://localhost:8001"`, `voice_public_url: str | None = None` (эффективно = voice_url если не задан), `port = 8003`, `default_lang = "en_US"`.
- **Тесты:** httpx-моки апстримов — `respx` (добавить в dev-deps). Минимум: senses-passthrough формы; sense 404 → 404; lang down → 502; audio-блок собран верно (url энкодится, engines из кэша); voice down → audio null, ответ 200.
- **OWNERSHIP.md + README** обновить под новую роль (композитор, D4-env, зависимость от lang/voice).

# Git

Работа в main tree, **commit-only, без push/веток**. Коммитить ТОЛЬКО `backend/learn/**`. Scope-тег: `refactor(backend-learn): ...`. Кириллица → `git commit -F <file>`.

# Acceptance

1. `uv sync --extra dev` чисто, lock пересобран, sqlalchemy/alembic/torch-стека в дереве deps нет (`uv pip list`).
2. `uv run pytest` — зелёные (respx-моки, живые сервисы не нужны).
3. `uv run ruff check .` — 0.
4. **Живой smoke** (lang :8002 + voice :8001 подняты): `curl ":8003/learn/lang/senses?q=bank"` → та же форма что раньше + `audio.url`; открыть `audio.url` → WAV играет; `curl :8003/learn/lang/senses/related?sense=<id>` работает.
5. Ни одного изменения вне `backend/learn/**`.

# Что НЕ делаем

- НЕ трогаем `backend/lang`, `backend/voice`, `apps/learn` (фронт — зона architect, отдельный шаг).
- НЕ user-БД/прогресс/SRS (следующая волна).
- НЕ уроки/упражнения-endpoints (продуктовая волна learn — после этой миграции).
- CI-workflow — зона architect.
