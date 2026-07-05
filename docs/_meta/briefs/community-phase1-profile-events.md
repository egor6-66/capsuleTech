---
title: backend/community — фаза 1: профиль (MinIO-аватар) + event-журнал + первые проекции (ADR 071)
status: ready (MinIO-контейнер добавит architect после обсуждения инфры — до этого avatar-часть за env-гейтом)
audience: owner-сессия `./claude-scope.sh backend-community` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [064, 067, 068, 070, 071]
---

# Контекст

ADR 071 принят. Bootstrap `backend/community/project.json` создан (:8006,
scope `backend-community`). Стек и анатомия — зеркало backend/auth
(py3.12/FastAPI/SQLAlchemy/Alembic/uv, tests, OWNERSHIP, README).

# Scope — фаза 1 целиком

## 1. Каркас
pyproject (deps ядра; `minio` клиент — опционален через lazy-import или extra),
`src/capsule_community/` {main, config, db, api, …}, alembic, OWNERSHIP, README.

## 2. Сессия через auth (ADR 071 D2)
`clients/auth.py`: резолв юзера passthrough-кукой → `GET {AUTH_URL}/auth/me`
(httpx; 401 → guest). Dependency `current_user` (обязателен) / `optional_user`.
env `AUTH_URL` (default `http://localhost:8004`). Кэш НЕ городить (ревокация
должна бить мгновенно — канон ADR 068 D3).

## 3. Профиль (ADR 071 D3)
- Таблица `profiles(user_id PK, nick unique, bio, avatar_key, contacts JSON,
  created_at)`; авто-создание пустого профиля при первом `GET /community/profile`
  (nick default = login из auth).
- `GET/PUT /community/profile` (member); `GET /community/profiles/{user_id}` и
  `GET /community/members` (список: nick+avatar; public).
- **Аватар:** `POST /community/profile/avatar` (multipart, лимит размера/тип
  webp/png/jpg) → MinIO бакет `avatars` (public-read), key в profiles.
  env `S3_URL/S3_ACCESS_KEY/S3_SECRET_KEY` — БЕЗ env сервис работает, avatar-
  эндпоинт отвечает 503 «storage not configured» (MinIO-контейнер приедет
  от architect'а следом; тесты — мок S3-клиента, живой MinIO не требуется).
- Отдача аватарки фронту: URL вида `/media/avatars/<key>` (константа-префикс;
  маршрут в gateway на MinIO сделает architect) — сервис только строит путь.

## 4. Event-журнал + проекции (ADR 071 D4)
- `events(id, user_id, source_app, kind, payload JSON, ts)` — только INSERT,
  индексы (user_id, ts), (source_app, kind).
- **Внутренний** `POST /internal/events` (batch): гейт shared-secret заголовком
  `X-Internal-Key` (env `INTERNAL_KEY`; без env — 503). ЧЕРЕЗ GATEWAY НЕ
  ПУБЛИКУЕТСЯ (architect не заводит /api-маршрут на /internal/*).
- Проекции v1 (SQL-агрегаты на лету): `GET /community/stats/{user_id}` →
  `{ total_points, per_app: {learn: {points, drills_passed, …}} }`. Правило
  подсчёта v1 простое и ЯВНО задокументированное (напр. kind='drill.passed'
  = +10) — конфиг-словарь kind→points в коде с комментом «расширяется».
- `GET /community/leaderboard?app=` → топ по points (public, nick+avatar).

## 5. Тесты
auth-клиент (мок httpx: member/guest/ревокация); профиль CRUD + авто-создание;
avatar 503-без-env + мок-S3 happy; events: INSERT-only (нет UPDATE/DELETE
эндпоинтов), internal-key гейт; проекции: события → ожидаемые суммы;
leaderboard сортировка.

# Что НЕ делаем (фазы 2-3)
Посты/лента/реакции, агент-ревью, чат/WS, materialized-проекции, интеграцию
learn-BFF (поставщик событий — отдельный бриф после этого).

# Acceptance
pytest+ruff зелёные; live (:8006 + auth :8004): register в auth → GET profile
(авто-создан) → PUT nick/bio → members/stats/leaderboard отвечают; POST
/internal/events c ключом → stats меняются; без ключа → 401/403.
Отчёт в коммит. Architect после мержа: gateway /api/community/* + CI-матрица.
