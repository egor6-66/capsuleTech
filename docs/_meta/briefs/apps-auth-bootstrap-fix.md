---
title: apps/auth — реальный bootstrap сессии через authApi.init (фикс ревью)
status: ready (ПОСЛЕ auth-api-init-bootstrap.md — нужен services.authApi.init)
audience: owner-сессия `claude-scope -Scope apps` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [068]
---

# Контекст

Ревью волны: комментарий в `apps/auth/src/features/app.tsx:54` («сессия уже
поднята bootstrap'ом») не соответствует коду — `initAuthSession` никто не зовёт.
`authApi.isAuthed()` в `guest.onInit` всегда false на старте → F5 после логина
показывает форму вместо authed-панели; broadcast-синк не активен.

# Scope (только apps/auth)

`src/features/app.tsx`, состояние `guest`:

```ts
onInit: async ({ store, state }) => {
  await authApi?.init();            // GET /me + подписка на broadcast-синк
  if (authApi?.isAuthed()) {
    store.update({ viewer: authApi.user() });
    state.set('authed');
  }
},
```

+ поправить лживый комментарий. Бонус-кейс (проверить руками): вкладка A logout
→ вкладка B (authed-панель) должна свалиться в guest — для этого authed-состояние
должно реагировать на смену сессии; если реактивной привязки store→session нет,
минимально: слушать через `authApi.isAuthed()` в UI-гарде Gate (viewer из
пакетной сессии, не из контекста Feature) ЛИБО зафиксировать как известный гэп
и STOP+surface architect'у — НЕ городить свой канал.

# Acceptance

- build+biome 0.
- Живой флоу через `:8080/auth/` (backend :8004 поднят): login → **F5 → authed-панель
  сохраняется** (главный критерий); logout → F5 → форма.
- Двух-вкладочный синк: проверить, доложить результат (ок/гэп) в коммит-сообщении.
