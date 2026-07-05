---
name: backend-community
owner-agent: owner-backend-community
group: backend (python, not npm-released)
zone: backend
status: alpha
priority: P1
last-updated: 2026-07-05
---

# backend-community (`capsule-community`)

Social core of the capsule ecosystem (ADR 071) — profile, append-only event
journal, and projections (points/stats/leaderboard). Identity stays in auth
(ADR 068); this service is the first "domain service" of ADR 068 D3 (resolves
sessions by passthrough, knows no passwords). Public HTTP contract
`/community/*`; internal write channel `/internal/*`.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `backend/community/` (Python, FastAPI + SQLAlchemy + Alembic, тулчейн uv).
- **Status:** `alpha` — Phase 1 (ADR 071 §phases): профиль + avatar-каркас + event-журнал + первые проекции. Contract D2/D3/D4 реализован, тесты зелёные.
- **Priority:** P1 — оживляет ЛК, но не блокирует identity (auth = P0).
- **Maturity bar → beta:**
  - MinIO-контейнер в docker-инфре поднят, avatar-эндпоинт реально пишет в бакет (architect: контейнер + gateway `/media/avatars/*`);
  - gateway `/api/community/*` маршрут заведён, `/internal/*` НЕ опубликован (architect);
  - CI job гоняет `test:py`+`lint:py` для backend-community (architect);
  - первый поставщик событий (learn-BFF) реально пишет `/internal/events` живьём.
- **Active blockers:** MinIO-контейнер + gateway-маршруты (`/api/community/*`, `/media/avatars/*`) — зона architect (приедут следом за мержем).
- **Roadmap (ADR 071 §phases):** посты/лента + агент-ревью seam + комменты/реакции (Phase 2); WS-чат + realtime + auth-события (Phase 3).
- **Last activity:** 2026-07-05 — founding scaffold (бриф `community-phase1-profile-events.md`, ADR 071).

## Vendor stack

- **FastAPI** (`fastapi >=0.115`) — HTTP-слой. https://fastapi.tiangolo.com/
- **SQLAlchemy 2.0** (`sqlalchemy >=2.0`) — ORM, declarative Base. https://docs.sqlalchemy.org/
- **Alembic** (`alembic >=1.13`) — миграции. https://alembic.sqlalchemy.org/
- **Pydantic v2** (`pydantic >=2.7`, `pydantic-settings`) — schemas + Settings. https://docs.pydantic.dev/
- **httpx** (`httpx >=0.27`) — async-клиент к auth (session passthrough). Runtime-dep (не dev). https://www.python-httpx.org/
- **python-multipart** — парсинг multipart для avatar-upload.
- **MinIO** (`minio >=7.2`, extra `storage`) — S3-клиент, **lazy-import** — ставится только когда аватары подключают. https://min.io/docs/minio/linux/developers/python/API.html
- **uv** — тулчейн (sync/lock/run). https://docs.astral.sh/uv/

## Зона ответственности

### Owns
- `backend/community/` полностью: `src/capsule_community/`, `tests/`, `alembic/`, `pyproject.toml`, `project.json`, `uv.lock`.

### Не трогает
- `backend/auth/` (identity-ядро, owner-backend-auth) — только **потребляет** контракт `/auth/me`.
- `backend/lang/`, `backend/voice/`, `backend/learn/`, `backend/image/` (свои owner'ы).
- `backend/telegram/`, `backend/scriber/`, `backend/fs/` (отдельные зоны).
- `@capsuletech/web-community` клиент, `apps/community`, dev-gateway (docker/nginx), MinIO-контейнер — зона architect (ADR 071 D5/D6).
- `.github/` CI-workflows, root `nx.json` (architect).

## Публичный API (контракт ADR 071 — не менять без ADR)

- `GET /health` → `{"status":"ok"}`.
- `GET /community/profile` (member) → авто-создаёт пустой профиль (nick = login). 401 guest.
- `PUT /community/profile` (member) `{nick?,bio?,contacts?}` → 200. 409 nick taken.
- `POST /community/profile/avatar` (member, multipart) → 200 | 503 (no storage) | 415 (bad type) | 413 (too large).
- `GET /community/profiles/{user_id}` (public) → 200 | 404.
- `GET /community/members` (public) → список `{user_id,nick,avatar_url}`.
- `GET /community/stats/{user_id}` (public) → `{total_points, per_app}`.
- `GET /community/leaderboard?app=&limit=` (public) → топ по points.
- `POST /internal/events` (`X-Internal-Key`) → batch INSERT. 503 (no key) | 403 (bad key). **НЕ через gateway.**

## Quirks / gotchas

- **`user_id` НЕ FK** (`models.py`) — auth это отдельный сервис/БД (ADR 068 D1), ссылка по значению; резолв юзера через `clients/auth.py` passthrough.
- **Session passthrough, без кэша** (`clients/auth.py:AuthClient.resolve`) — куку запроса кидаем в `auth /auth/me` на каждый запрос; ревокация должна бить мгновенно (ADR 068 D3). Auth недоступен → fail-closed (guest): запись запрещена, публичное чтение живёт.
- **Storage opt-in** (`storage.py:storage_configured`) — без `S3_*` env avatar-эндпоинт отдаёт 503; `minio` lazy-import (extra `storage`), core и тесты его не требуют (S3 мокается).
- **Internal-channel opt-in** (`api/events.py:require_internal_key`) — без `INTERNAL_KEY` `/internal/*` = 503; иначе mismatch = 403.
- **Append-only журнал** — у `events` нет update/delete-эндпоинтов; статистика = проекции (`projections.py`), не хранимые счётчики. Новая метрика = новая проекция по истории, ноль миграций данных.
- **Points-правила v1** (`projections.py:KIND_POINTS/KIND_COUNTERS`) — конфиг-словари в коде (`drill.passed = +10`), явно расширяемые.
- **Naive-UTC datetimes** (`utils.py:utcnow`) — паттерн 1:1 с backend-auth (SQLite dialect не round-трипит tz-aware).

## План рефакторинга / оптимизаций

- [ ] **Materialized-проекции** — когда объём событий вырастет, заменить on-the-fly агрегаты (ADR 071 D4). (priority: medium)
- [ ] **Посты/лента + агент-ревью seam** — Phase 2 (ADR 071 §phases). (priority: medium)
- [ ] **WS-чат** — Phase 3, изолированный модуль (ADR 071 D6). (priority: low)
- [x] **Founding scaffold** — 2026-07-05, бриф `community-phase1-profile-events.md`, ADR 071.

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `tests/test_auth_client.py` | session passthrough: member / guest / revocation(401) / cookie-forward / auth-unreachable (мок httpx) |
| API | `tests/test_profile_api.py` | profile авто-создание, PUT nick/bio/contacts, 409 nick, public profiles/members, avatar 503/415/mock-S3 |
| API | `tests/test_events_api.py` | internal-key гейт (503/403/201), append-only (нет update/delete), stats-проекция, leaderboard-сортировка |

**Перед изменением:** `uv run pytest` green. **Перед release:** контракт ADR 071 не ломать без ADR.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| `backend/auth` (`/auth/me` контракт — потребляем) | owner-backend-auth |
| `backend/learn` (будущий поставщик событий через learn-BFF) | owner-backend-learn |
| `@capsuletech/web-community`, `apps/community`, dev-gateway, MinIO-контейнер | architect |
| CI workflows / nx shared infra | architect |
