# 🐳 ТЗ агенту — зона `docker/`

> 🎯 **Ты ведёшь `docker/`** — инфраструктуру раздачи/приёма сборок и (в перспективе) серверного build+dev воркспейса capsule. Этот файл = твой бриф. **Общая картина платформы** — `docs/playground/platform.md` (прочитай). **Где это в плане** — `docs/playground/roadmap.md`.

---

## 🧠 Картина за 30 секунд

Платформа = серверный **build + dev воркспейс**. На вход — **готовый билд**, **исходник** или **контейнер**; на выходе — раздача, а для исходника ещё **сборка персонального продукта заказчика** (база + только его фичи, из per-tenant JSON-конфигов редакторов) + правка/тесты/мониторинг прямо в браузере.

> 💡 «По сути в контейнере можем поднять и запустить что угодно.» preview-server = слой **раздачи**; `forge` (Rust) = **оркестратор**; **ты** = образы/networking/HTTP-слой приёма-раздачи.

---

## 📍 Текущее состояние (что уже есть)

`docker/preview-server/` (Node, ADR 024 — прочти `README.md` + `server.mjs`):
- `POST /api/deploy/:app` — приём gzip-tar `dist/` (Bearer-токен) → раздача под **base-путём** (`/ewc/`); `X-Capsule-Root: 1` → под `/`.
- `GET /api/apps` — JSON-список развёрнутого. `GET` статика + SPA-fallback. **Открыт** (внутр. сеть / VPN).
- Реестр `_registry.json`. **Одна версия на апп** (новый deploy перезаписывает).

---

## 🏷️ Твоя зона vs соседи

| Зона | Чья | Что |
|---|---|---|
| **`docker/`** ← ТВОЁ | ты | Dockerfile/образы, `docker-compose`, networking/VPN, HTTP-слой приёма-раздачи (preview-server и его эволюция), volume'ы, **пред-кеш `@capsuletech/*`** в образе |
| `backend/forge/` | главный / owner-forge | Rust-оркестратор (axum HTTP+WS, рулит Docker через bollard, дирижирует `capsule build`/`vitest`/`tsserver`) — **НЕ ты** |
| `packages/cli/` | owner-cli | `capsule deploy` (шлёт билд + git-инфа) |
| `apps/playground/` | owner playground | UI: список билдов + инфо + переход |
| root (`tsconfig.base`/`nx.json`/root `package.json`) | главный | shared-infra — запрашивай |

> 🤝 **Швы согласуются через главного, contracts-first:** формат метадаты сборки (с owner-cli + playground), `deploy`/`workspace` API. Мокаешь контракт → работаешь параллельно.

---

## ✅ ПЕРВАЯ ЗАДАЧА (P1) — доставка билдов + метадата

Цель: при деплое с локальной машины вместе с билдом приезжает **git-инфа**; playground рисует список с инфой и переходом в билд.

**Контракт метадаты (согласовать с owner-cli + playground через главного):**
```
{ app, base, branch, commit, date, author, message?, deployedAt }
```

**Твоя часть (preview-server):**
1. `handleDeploy` принимает git-поля — из **заголовков** (`X-Capsule-Branch`, `X-Capsule-Commit`, `X-Capsule-Author`, `X-Capsule-Date`, …) **или** манифеста в тарболе (`capsule.build.json`). ← способ согласовать с owner-cli.
2. Сохраняешь поля в **registry-entry** (`_registry.json`).
3. `GET /api/apps` возвращает их в каждом элементе.

**Инварианты:**
- ⛔ **Не ломать текущую раздачу/контракт.** Старые деплои без метадаты → поля `null`, ничего не падает.
- 🔜 **Версионирование** в `server.mjs` помечено future (`${DATA_DIR}/<app>/<version>/`). Пока single-version, но **закладывай расширяемость** — несколько версий + **branch/PR-превью** — близкая хотелка (build-метадата уже несёт `branch`).

---

## 🪜 Дальше (контекст, не сейчас — детали в `platform.md`)

| Фаза | Что |
|---|---|
| **P2** | приём **исходника** (`POST /api/workspace`) + пред-кеш deps в образе → серверная сборка |
| **P3** | **ephemeral per-tenant** контейнеры (изоляция); `forge` оркестрирует — ты даёшь образы/compose |
| **P4** | воркспейс-возможности (web-code IDE, тесты, монитор по WS) — ты обеспечиваешь рантайм, forge дирижирует |

---

## 🌐 Сеть / VPN / безопасность

- **GET (просмотр) открыт** — рассчитан на внутреннюю сеть / **VPN** (ADR 024). **POST (deploy/workspace) — Bearer-токен.**
- **Контейнер с локального компа:** CLI авторизуется **кредами сервера** (юзер указывает сервер + токен); образ при старте уже содержит всё для работы.
- 🔒 **Air-gapped (жёсткий инвариант):** НЕ хардкодить внешние URL; всё через env (`PUBLIC_HOST`, токен, порты, `DATA_DIR`, `MAX_UPLOAD_BYTES`). Capsule может крутиться в закрытом контуре.
- 🧪 **Изоляция воркспейса** (исходник = произвольное исполнение): **ephemeral per-tenant** контейнеры, лимиты CPU/RAM, таймауты, без доступа к хосту. v1 — single-tenant, но модель закладываем сразу.
- ⚠️ Reverse-proxy (nginx): `client_max_body_size` ≥ `MAX_UPLOAD_BYTES` — иначе `413` (частая грабля, см. README).

---

## 📡 Раздача с локального компа

Единый канал: CLI пушит на сервер **билд** (P1) → позже **исходник** (P2) → **контейнер** (P3+). Креды сервера в CLI. **Обновление самого playground / воркспейса — по ТОМУ ЖЕ каналу** (один механизм доставки на всё: playground едет с фреймворком, дальше обновляется как обычная сборка).

---

## 🚫 Правила работы

- ⛔ **Не ломать работающий preview-server** — он в проде у юзера, билды льются туда.
- 🦀 **Rust-оркестрация — не твоя зона** (`backend/forge`). Ты даёшь образы/compose/networking, forge дирижирует.
- 🔧 **Shared-infra root** (`tsconfig.base.json`/`nx.json`/root `package.json`) — только главный, запрашивай.
- 🌳 **Git:** коммиты строго по путям `docker/**`, scope-тег `feat(docker): …`/`fix(docker): …`, **никогда `git add -A`** (общее дерево — см. `docs/_meta/parallel-dev-flow.md`). Git-операции — через owner-git.
- 🤝 **Контракты на швах** (метадата, API) — согласуй через главного **до** реализации; потребитель мокает.

---

## 🔗 Референсы

- `docker/preview-server/server.mjs` + `README.md` — текущая реализация.
- **ADR 024** — `docs/01-architecture/adr/024-preview-deploy-server.md`.
- `docs/playground/platform.md` — видение платформы + `forge` (B1–B5, композиция фич, entitlements).
- `docs/playground/roadmap.md` / `architecture.md` — фазы, топология, WS-канал.
- `docs/_meta/parallel-dev-flow.md` — git-режим параллельной работы.
