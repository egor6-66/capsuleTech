---
title: apps/auth — универсальный auth-апп (standalone, redirect-флоу ?next=)
status: ready (СТАРТ ПОСЛЕ мержа auth-credentials-cookie-session.md — блоки Auth.* нужны реальные)
audience: owner-сессия `claude-scope -Scope apps` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [068]
---

# Контекст

ADR 068 D7: `apps/auth` — формы входа/регистрации на `@capsuletech/web-auth`,
универсальный для любого аппа экосистемы. Волна ф.1 — **standalone + redirect**:
апп X шлёт юзера на `/auth/?next=<path>`, после входа auth-апп возвращает по
`next`. Кука same-origin (gateway) — виднa всем аппам автоматически;
BroadcastChannel-синк уже в пакете. Embed через web-remote — шаг 2, не сейчас.

Gateway УЖЕ маршрутизирует `/auth/` → `:3200` (nginx reload сделан architect'ом).

# Scope

1. **Скаффолд через CLI** (канон, не руками):
   `CAPSULE_CI=1 node packages/cli/bin/capsule.mjs create app auth` из repo-root.
2. **Конфиг:** base `'/auth/'` в capsule.config.ts (образец — apps/learn),
   dev-порт **:3200** (по образцу как learn задаёт :3100). api-базы в
   capsule.app.ts: `bases: { default: '/api' }`. `packages: ['@capsuletech/web-auth']`
   (+ boost-layout/web-shell ТОЛЬКО если реально нужен app-shell хром;
   минимализм — форма по центру, Ui.Layout.Flex достаточно).
3. **Bootstrap:** `initAuthSession('/api')` при загрузке (см. пакетный API
   после брифа auth-credentials-cookie-session).
4. **Страница `/`:** центрированная карточка — `Auth.Login type="credentials"`
   + переключение на регистрацию (как пакет отдаст: Register-блок или таб).
   Если юзер УЖЕ authed (useAuth) — показать «вы вошли как <login>» + кнопка
   logout + кнопка «продолжить» по next.
5. **Root-Feature (redirect-флоу):**
   - читает `?next=` из URL;
   - `onLogin` → редирект на next; `onLogout` → остаёмся на форме;
   - **🔒 open-redirect guard:** next принимается ТОЛЬКО как same-origin path
     (начинается с `/`, НЕ с `//` и НЕ содержит `://`) — иначе fallback `/`.
     Редирект НА ДРУГОЙ БАЗОВЫЙ ПУТЬ аппа (`/learn/...`) = полная навигация
     `window.location.assign(next)`, НЕ router.goTo (другой апп = другой SPA).
   - без next: после входа показываем authed-состояние (п.4), не редиректим.
6. **Канон app-слоёв** (apps/OWNERSHIP.md): 0 импортов, 0 raw-class, Ui.Flow.*.

# Acceptance

- `capsule build` чист, biome 0.
- Живой флоу через gateway (backend/auth на :8004 поднят:
  `cd backend/auth; uv run uvicorn capsule_auth.main:app --port 8004`):
  1. `:8080/auth/` — форма рендерится;
  2. register нового юзера → авто-вход (кука) → authed-состояние;
  3. `:8080/auth/?next=/learn/library/explorer` → login → редирект в learn;
  4. logout → `GET /api/auth/me` = 401;
  5. вторая вкладка на `:8080/auth/` — logout в первой переводит её в guest
     (BroadcastChannel).
- Прямой порт :3200 с `/api` НЕ работает до vite-builder apiProxy — верифицируем
  через gateway.

# Что НЕ делаем

- Embed в другие аппы через web-remote (шаг 2 волны).
- Пилот learn (guest/member, ловля onLogin) — отдельный бриф после этого.
- Никакой своей auth-логики в аппе — только монтаж блоков + redirect-флоу.
