---
title: web-auth — services.authApi.init() (bootstrap сессии из app-слоя без импортов)
status: ready
audience: owner-сессия `claude-scope -Scope auth` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [068]
---

# Контекст (баг ревью волны)

`initAuthSession` (GET /me + подписка BroadcastChannel) реализован и оттестирован,
но НЕ вызывается никем: app-слои не могут импортировать пакет (канон no-imports),
а в `services.authApi` метода init нет. Итог: cookie-сессия не восстанавливается
после F5 (кука жива, store пуст), broadcast-синк между вкладками не активен.
Дыра моего брифа `apps-auth-standalone.md` (architect) — «initAuthSession при
загрузке» был невыполним из аппа.

# Scope

`src/capsule.ts` — добавить в `registerPackageServices('authApi', …)`:

```ts
/**
 * Bootstrap cookie-сессии (ADR 068 D3/D4): GET /auth/me → session-store
 * (authed | guest) + подписка на BroadcastChannel-синк. Идемпотентен
 * (повторный вызов переподписывает без дубля — контракт initAuthSession).
 * Root-Feature аппа зовёт в onInit ДО чтения isAuthed().
 * @returns юзер | null (guest)
 */
init: (apiBase?: string) => initAuthSession(apiBase),
```

+ typing в module augmentation `CapsuleServices.authApi`.

# Тесты

Мини: `authApi.init` прокидывает apiBase в initAuthSession и возвращает user/null
(мок fetch). Существующие init-тесты сессии не трогать.

# Acceptance

`pnpm --filter @capsuletech/web-auth test` зелёные; build чист (dist пересобрать);
biome 0.
