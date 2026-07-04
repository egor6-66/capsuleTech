---
name: backend-auth
owner-agent: owner-backend-auth
group: backend (python, not npm-released)
zone: backend
status: alpha
priority: P0
last-updated: 2026-07-03
---

# backend-auth (`capsule-auth`)

Identity core for the whole capsule ecosystem (ADR 068 D1) — one account,
additive login methods, XSS-resistant sessions with instant server-side
revocation. Public HTTP contract `/auth/*`; every app is a consumer via
`@capsuletech/web-auth` (apps/auth is the reference client, architect zone).

## Состояние (читать ПЕРВЫМ)

- **Zone:** `backend/auth/` (Python, FastAPI + SQLAlchemy + Alembic, тулчейн uv).
- **Status:** `alpha` — Phase 1 (ADR 068 §phases): identity-ядро с credentials-провайдером, contract D2/D3 реализован, тесты зелёные.
- **Priority:** P0 — identity блокирует guest/member differentiation во всех аппах (learn первый пилот).
- **Maturity bar → beta:**
  - CI job гоняет `test:py`+`lint:py` для backend-auth (зона architect);
  - dev-gateway (docker/nginx, ADR 068 D6) поднят и `apps/auth` реально ходит через него;
  - учебный пилот (`backend/learn` guest/member через web-access) подтверждён живьём.
- **Active blockers:** нет.
- **Roadmap:** telegram-identity (Phase 2, через `backend/telegram`), OAuth-провайдеры (Phase 3), realtime с community (Phase 3).
- **Last activity:** 2026-07-03 — founding scaffold (бриф `backend-auth-identity-core.md`, ADR 068).

## Vendor stack

- **FastAPI** (`fastapi >=0.115`) — HTTP-слой. https://fastapi.tiangolo.com/
- **SQLAlchemy 2.0** (`sqlalchemy >=2.0`) — ORM, declarative Base. https://docs.sqlalchemy.org/
- **Alembic** (`alembic >=1.13`) — миграции. https://alembic.sqlalchemy.org/
- **Pydantic v2** (`pydantic >=2.7`, `pydantic-settings`) — schemas + Settings. https://docs.pydantic.dev/
- **argon2-cffi** (`argon2-cffi >=23.1`) — единственный способ хэшировать пароли в этом сервисе. https://argon2-cffi.readthedocs.io/
- **uv** — тулчейн (sync/lock/run). https://docs.astral.sh/uv/

## Зона ответственности

### Owns
- `backend/auth/` полностью: `src/capsule_auth/`, `tests/`, `alembic/`, `pyproject.toml`, `project.json`, `uv.lock`.

### Не трогает
- `backend/lang/`, `backend/voice/`, `backend/learn/` (свои owner'ы) — даже смежные identity-consumers.
- `backend/telegram/`, `backend/scriber/`, `backend/fs/` (отдельные зоны).
- `apps/auth`, `@capsuletech/web-auth` клиент, dev-gateway (docker/nginx) — зона architect (ADR 068 D6/D7).
- `.github/` CI-workflows, root `nx.json` (architect).

## Публичный API (контракт ADR 068 D2/D3 — не менять без ADR)

- `GET /health` → `{"status":"ok"}`.
- `POST /auth/register` `{login,password}` → 201 `{id,login,role}` + Set-Cookie. 409 login taken.
- `POST /auth/login` `{login,password}` → 200 `{id,login,role}` + Set-Cookie. 401 invalid pair.
- `POST /auth/logout` → 204, ревокация + сброс куки, идемпотентен.
- `GET /auth/me` → 200 `{id,login,role}` | 401 (guest). Обновляет `last_seen`.

Кука `capsule_session`: opaque `secrets.token_urlsafe(32)`, `httpOnly`, `SameSite=Lax`,
`Secure` в prod. БД хранит только sha256-хэш токена (`security.py:hash_token`).

## Quirks / gotchas

- **`UserSession` ≠ table name `sessions`** (`models.py`) — класс назван `UserSession`, чтобы не тенить `sqlalchemy.orm.Session`, который импортится тем же модулем как `DbSession` в `repo.py`/`api.py`.
- **Naive-UTC datetimes везде** (`utils.py:utcnow` = `datetime.now(UTC).replace(tzinfo=None)`, не deprecated `datetime.utcnow()`) — сравнения `expires_at`/`last_seen` идут в Python, не в SQL; tz-aware datetime через SQLite dialect не гарантирован (round-trip квирк).
- **native_enum=False** (`models.py:_enum`) — string-valued enum-колонка ради drop-in SQLite→Postgres, паттерн 1:1 с backend-lang.
- **Lazy session reaping** (`repo.py:resolve_session`) — истёкшая сессия удаляется в момент обращения к `/auth/me`, отдельного reaper-джобы нет (осознанный скоуп Phase 1).
- **`identities` — аддитивная ось** — новый способ входа (telegram/oauth) = новая строка с новым `provider`, ядро `users` не трогается.

## План рефакторинга / оптимизаций

- [ ] **Telegram-identity** — `provider='telegram'`, интеграция с `backend/telegram` (Phase 2, ADR 068 §phases). (priority: medium)
- [ ] **OAuth-провайдеры** — по потребности (Phase 3). (priority: low)
- [ ] **Session reaper** — периодическая чистка вместо чисто lazy (если объём сессий вырастет). (priority: low)
- [x] **Founding scaffold** — 2026-07-03, бриф `backend-auth-identity-core.md`.

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit/API | `tests/test_auth_api.py` | register/login/logout/me, 409/401, expired-session reap, no-raw-secrets-in-DB |

**Перед изменением:** `uv run pytest` green. **Перед release:** contract D2/D3 не ломать без ADR.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| `backend/lang` (соседний capability-сервис, тот же паттерн) | owner-backend-lang |
| `backend/voice` (TTS capability, порт 8001) | owner-backend-voice |
| `apps/auth`, `@capsuletech/web-auth`, dev-gateway | architect |
| CI workflows / nx shared infra | architect |
