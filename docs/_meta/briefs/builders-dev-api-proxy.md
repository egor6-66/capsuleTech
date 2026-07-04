---
title: vite-builder — dev server.proxy '/api' → gateway (относительные api-базы)
status: ready
audience: owner-сессия `claude-scope -Scope vite-builder` (commit-only, без push)
last_updated: 2026-07-03
adr_refs: [068]
---

# Контекст

ADR 068 D5/D6: api-базы аппов становятся относительными (`bases: { default: '/api' }`) —
same-origin через dev-gateway (`localhost:8080`, `docker/gateway/`). Но при запуске аппа
НА ПРЯМОМ ПОРТУ (`:3100`) относительный `/api` бьёт в сам Vite → 404. Нужен штатный
dev-fallback: Vite проксирует `/api` в gateway. Карта маршрутов при этом живёт ТОЛЬКО
в nginx (никакого дубля маршрутов в builder'е).

# Scope

В `packages/builders/vite/src/defines/capsuleConfig.ts`:

1. `ICapsuleConfig` + поле:
   ```ts
   /**
    * Dev-прокси API на gateway (ADR 068): '/api' форвардится на этот origin,
    * чтобы относительные api-базы работали и на прямом порту аппа.
    * `false` — выключить. Дефолт: 'http://localhost:8080'.
    */
   apiProxy?: string | false;
   ```
2. В dev-ветке server-конфига:
   ```ts
   server: {
     ...,
     proxy: config.apiProxy === false ? undefined : {
       '/api': { target: config.apiProxy ?? 'http://localhost:8080', changeOrigin: false },
     },
   }
   ```
   `changeOrigin: false` — host остаётся localhost, кука auth не ломается.
3. Только dev (`createDevServer`); build не трогает.

# Тесты

Рядом с существующими тестами defines: дефолт даёт proxy на :8080; `apiProxy: false` → нет proxy; кастомный origin → подставлен.

# Acceptance

`pnpm --filter @capsuletech/vite-builder test` зелёные; `build` пакета ок; biome 0.
Помнить: consumer-аппы увидят изменение только после `pnpm --filter @capsuletech/vite-builder build` + рестарт dev (dist-канон).

# Что НЕ делаем

- Никакой карты маршрутов в builder (single hop на gateway, маршруты в nginx).
- Прод-поведение/preview не трогаем.
