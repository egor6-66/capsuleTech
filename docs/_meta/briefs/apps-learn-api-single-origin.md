---
title: apps/learn — api-базы на single-origin '/api' + apiBase в Learn.Provider (фикс «нет слов»)
status: ready
audience: owner-сессия `claude-scope -Scope apps` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [055, 067, 068]
---

# Контекст

Баг «нет слов» на /library/explorer: `pages/_workspace/index.tsx` монтирует
`<Learn.Provider>` БЕЗ `apiBase` → дефолт `''` → пакетный `fetchSenses`
(`web-learn/src/library/api.ts`) бьёт в относительный `/learn/lang/senses`
на origin'е самого Vite → пусто (tiles=0). Root cause задиагностирован, фикс не сделан.

Решение user: НИКАКИХ быстрых фиксов (хардкод `:8003`) — делаем канон ADR 068:
все запросы через single-origin `/api`, dev = prod (dev-gateway :8080 уже жив,
`docker/gateway/`). Маршрутизация gateway: `/api/learn/<rest>` → `:8003/learn/<rest>`,
`/api/voice/<rest>` → `:8001/voice/<rest>`. Пакетный api строит
`${apiBase}/learn/lang/senses` → канонический `apiBase = '/api'`. Значение
одинаково в dev и prod — это контракт single-origin, не хардкод.

# Scope (только apps/learn)

1. `apps/learn/capsule.app.ts` — api-базы на относительные:
   ```ts
   api: () => ({
     bases: { default: '/api', voice: '/api' },
   }),
   ```
   Комментарий про CORS/абсолютный localhost переписать: same-origin через
   gateway (ADR 068), CORS больше не нужен. Раздельный ключ `voice` оставить
   (семантический шов — в prod базы могут разойтись).
   (`endpoints/voice.ts` GET `/voice/engines` c base `voice` → `/api/voice/engines` → ok, не трогать.)

2. `apps/learn/src/pages/_workspace/index.tsx` — прокинуть базу в пакет:
   ```tsx
   <Learn.Provider apiBase="/api">
   ```

# Что НЕ делаем

- НЕ трогаем `packages/web/learn` (проп `apiBase` уже есть).
- НЕ хардкодим `http://127.0.0.1:8003` нигде.
- Карту маршрутов в апп не тащим — она живёт только в nginx gateway.

# Пререквизиты запуска (зона user/infra, НЕ owner-apps)

- Смотреть через gateway: `http://localhost:8080/learn/library/explorer`
  (прямой порт `:3100` с относительным `/api` заработает только после
  реализации `apiProxy` в vite-builder — бриф `builders-dev-api-proxy.md`,
  ещё не сделан; до него верифицируем ЧЕРЕЗ gateway).
- learn-бэк перезапустить с `VOICE_PUBLIC_URL=/api` — тогда composed
  `audio.url` = `/api/voice/speak?...` (same-origin 🔊). Без env озвучка
  продолжит ходить в `:8001` напрямую (работает, но не канон).
- После правки capsule.app.ts — рестарт dev `--force` (config читается на старте;
  заодно осядет registry regen после удалённых widgets/views).

# Acceptance

- `capsule build` аппа чист, `pnpm exec biome check apps/learn` 0 ошибок.
- Глазами на `:8080/learn/library/explorer`: плитки слов видны (бэк lang :8002 +
  learn :8003 должны быть живы), поиск фильтрует, клик по слову наполняет Info,
  🔊 играет.
