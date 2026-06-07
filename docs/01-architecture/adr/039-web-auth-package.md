---
tags: [hca, adr, accepted, auth, package]
status: accepted
date: 2026-06-07
---

> [!info] Status
> **Accepted (направление)** — 2026-06-07. Решение из playground-сессии: вынести авторизацию в domain-пакет `@capsuletech/web-auth` (паттерн web-shell/table/map). Реализация: ADR → скаффолд пакета → **завести owner-web-auth агента → рестарт сессии** (new-agent constraint) → миграция playground-прототипа. Связано: [[033-package-registration|ADR 033]] (регистрация), [[032-package-controllers-and-useemit|ADR 032]] (события), [[038-msw-mock-system|ADR 038]] (моки), [[035-web-agent-package|ADR 035]] (паттерн осевой параметризации).

# ADR 039 — Auth как domain-пакет `@capsuletech/web-auth`

## Контекст

Авторизация сейчас живёт в аппе (ewc + playground-прототип: `features/auth` + `endpoints/auth` + form-View/Widget/Page). Но входов будет **много стратегий**: по роли, по логину/паролю, OAuth 2.0, по QR-коду и т.д. Каждый апп переписывал бы это заново. По экосистемному паттерну (Matrix→web-shell, DataTable→web-table, MapView→web-map; ADR 033) — выносим домен «auth» в пакет с самого старта.

## Решение

### 1. `@capsuletech/web-auth` — domain-пакет, глобал `Auth.*`

Opt-in через `capsule.app.ts: packages: ['@capsuletech/web-auth']` (ADR 033) → глобал `Auth.*` + ambient-типы из codegen. Уходит из app-кода (не каждому аппу нужен / нужен по-разному).

### 2. Параметризация — ось стратегии

Как web-agent (транспорт/тулсет/персона, ADR 035) — `web-auth` параметризуется **стратегией входа** по subpath-блокам:
- `/role` — вход по роли (developer/support/…),
- `/credentials` — логин+пароль,
- `/oauth2` — OAuth 2.0 flow,
- `/qr` — вход по QR-коду.

Каждая стратегия = свой блок: контракт endpoint'а + auth-FSM-конфиг + form-блок. Апп подключает нужные.

### 3. Граница пакет ↔ апп

**В пакете:**
- **Стратегии** (`/role`, `/credentials`, `/oauth2`, `/qr`).
- **Auth-FSM** — `idle → submitting → authed/error`, параметризован стратегией (generic-флоу, не дублируется).
- **Form-блоки** — переиспользуемые themed-формы (web-ui), параметризуемы полями стратегии (config-driven, не хардкод-разметка per app).
- **Session** — хранение токена, current-user/role, хук `useAuth()` (читать роль/статус в любом слое).
- **Controllers + события (ADR 032)** — эмиттит ИМЕНОВАННЫЕ `onLogin` / `onLogout` / `onError` через `useEmit` в app-Feature; phantom `__events` → типизация `target.payload`.

**В аппе:**
- Роутинг (login-роут, post-login назначение, route-guards).
- Маппинг **роль → права** (app-specific permissions).
- Брендинг/копирайт формы, выбор стратегии(й) + конфиг.
- Backend endpoint `/auth/login` (контракт — пакет; реализация — app/backend).

### 4. Моки — через MSW (ADR 038)

Пакет определяет контракт `/auth/login` (чистый, без мок-веток). Апп мокает его в своём `mocks/` (MSW handler: `password === '123'` → `{ token, role }`). Никакого `__CAPSULE_MOCKS__`/inline-preRequest в пакете.

**Поток:** `Page → Auth.Role.LoginForm (config) → Auth-FSM → services.api.auth.login() → (dev) MSW → {token, role} → session + событие onLogin → app-Feature (routing + rights)`. Полностью как ручная HCA-сборка, но через пакет + конфиг.

## Последствия

- **Новый пакет** `packages/web/auth/` + **owner-web-auth** агент. ⚠️ Новый агент подхватывается только **после рестарта сессии** → порядок: скаффолд пакета + завести агента → рестарт → реализация/миграция.
- **Релиз:** группа `web_base` (fixed, tag `web@{version}`) — добавить в `nx.json` (зона главного).
- **Миграция:** playground auth-прототип (`features/auth` + `endpoints/auth` + AuthForm/Widget/Page) → промоут в пакет (`/role`-стратегия) + тонкая app-обвязка (routing/rights).
- **Зависит от:** ADR 033 (регистрация), ADR 032 (события), ADR 038 (MSW-моки), web-ui (form-блоки), web-query (контракт endpoint), web-state (session-FSM).
- **Старт:** одна стратегия `/role` (по playground-прототипу); `/credentials`/`/oauth2`/`/qr` — итерациями.

## Альтернативы (отклонены)

- **Оставить auth в аппе** — дублирование в каждом аппе, не масштабируется на стратегии. Отклонён (причина ADR).
- **Auth внутри web-shell** — другой домен (shell = chrome/layout); auth самостоятелен. Отклонён.
- **Один монолит-компонент `<Login/>` с пропсами под все стратегии** — раздувается; ось стратегии через subpath-блоки чище (как web-agent).
