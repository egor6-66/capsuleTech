---
title: backend/auth — identity-ядро (users+identities+sessions, httpOnly-кука, credentials)
status: ready
audience: owner-сессия `claude-scope -Scope backend-auth` (commit-only, без push)
last_updated: 2026-07-03
adr_refs: [067, 068]
---

# Контекст

ADR 068: единая identity экосистемы. `backend/auth` (`backend-auth`, порт **:8004**) — capability-сервис: учётки, способы входа (ось-стратегия identities), сессии в httpOnly-куке с серверной ревокацией. Доменных знаний (баллы/рейтинг/бан) тут НЕТ — это community. Стек как у lang/learn: Python 3.12+, FastAPI, SQLAlchemy+Alembic, uv, SQLite drop-in Postgres (`native_enum=False`).

`backend/auth/project.json` bootstrap'нут main'ом. Fence: scope `backend-auth`, работа в main tree, **commit не пройдёт** (хук режет main) — оставь изменения в дереве, коммитит architect после ревью.

# Схема (ADR 068 D2)

- `users`: `id PK, login VARCHAR unique, role VARCHAR default 'member' (member|admin), created_at`.
- `identities`: `id PK, user_id FK, provider VARCHAR ('credentials' сейчас; 'telegram'/'oauth-*' потом), external_id VARCHAR, secret_hash VARCHAR NULL, created_at`; unique `(provider, external_id)`. Для credentials: `external_id = login`, `secret_hash` = argon2-хэш пароля (`argon2-cffi`).
- `sessions`: `id PK, user_id FK, token_hash VARCHAR unique, created_at, expires_at, last_seen`. Хранится **sha256-хэш** токена, сырой токен только в куке. TTL 30 дней (константа в config).

# Контракт (fixed, ADR 068 D2/D3)

- `POST /auth/register` `{login, password}` → 201 `{id, login, role}` + Set-Cookie. 409 если login занят. Валидация: login 3-64 (нормализовать lower/trim), password ≥ 8.
- `POST /auth/login` `{login, password}` → 200 `{id, login, role}` + Set-Cookie. 401 на неверную пару (без различения «нет юзера»/«не тот пароль»).
- `POST /auth/logout` → 204; ревокация session-строки + сброс куки. Идемпотентен (без куки — тоже 204).
- `GET /auth/me` → 200 `{id, login, role}` | 401 (нет/протухшая/ревокнутая кука). Обновляет `last_seen`.
- `GET /health` → `{"status":"ok"}`.

**Кука** `capsule_session`: значение = `secrets.token_urlsafe(32)`; `httpOnly=True, samesite='lax', path='/'`; `secure` — из settings (`COOKIE_SECURE`, default False для dev). `max_age` = TTL.

# Детали

- **config.py** (паттерн lang/learn): `database_url='sqlite:///./auth.db'`, `port=8004`, `session_ttl_days=30`, `cookie_secure=False`, `cors_origins: list[str] = []` (пусто = CORS-миддлвара не ставится; за dev-gateway same-origin, CORS не нужен).
- Пароли: только `argon2-cffi` (никаких sha/bcrypt-самоделок). Сравнение токена: хэшируй входящий и ищи по `token_hash` (константное сравнение не нужно — ищем хэш по индексу).
- Протухшие сессии: lazy-чистка (на `/auth/me` при `expires_at < now` — удалить строку и 401). Отдельный reaper — не сейчас.
- **project.json targets**: `serve` (:8004), `migrate`, `test:py`, `lint:py` — зеркало backend-lang (cwd `backend/auth`).
- **OWNERSHIP.md** (шаблон docs/_meta/OWNERSHIP-template.md) + README (uv sync/migrate/serve, схема, cookie-модель).
- CI-матрица: зона architect (добавит `auth` в ci.yml), не трогать `.github/`.

# Тесты (pytest + TestClient, как в lang)

- register → 201 + кука; повторный login занят → 409.
- login верный/неверный → 200+кука / 401.
- `/me` с кукой → 200 и тот же юзер; без куки → 401.
- logout → 204, после него `/me` с той же кукой → 401 (ревокация реальна, не только сброс куки).
- истёкшая сессия (подделать `expires_at` в БД) → `/me` 401 + строка удалена.
- в БД нет сырых токенов/паролей (проверить, что колонки содержат хэши ≠ исходным значениям).

# Acceptance

1. `uv sync --extra dev` чисто, `uv.lock` в дереве.
2. `uv run alembic upgrade head` → `auth.db`.
3. `uv run pytest` зелёные; `uv run ruff check .` — 0.
4. Живой smoke: `uvicorn :8004` → register → login → `/me` → logout → `/me` 401 (curl с cookie-jar: `curl -c jar -b jar`).
5. Изменения ТОЛЬКО в `backend/auth/**`.

# Что НЕ делаем

- Телеграм/OAuth-identity (фаза 2 — схема их уже принимает), refresh-токены, rate-limit, e-mail.
- Роли сверх `member|admin`, баллы/рейтинг (community).
- Фронт (`apps/auth`, web-auth клиент) — зона architect.
- dev-gateway (docker/nginx) — зона architect.
