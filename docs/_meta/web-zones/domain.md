---
title: web-zone-domain
description: Canon для zone `domain` — stateful feature-packages ("мини-апп как пакет"). Source of truth о scope, no-horizontal canon, contract pattern, vendor-stack.
status: canon
last_updated: 2026-06-11
---

# Zone: domain

> Физическая директория: `packages/web/domain/` (после Phase D миграции; на момент 2026-06-11 — плоский `packages/web/{auth,shell,agent}/`).
>
> Канон-источники: [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1 (zones) + **D2 (no horizontal between domain)** + D3 (vendor transparency), [[033-package-registration|ADR 033]] (defineCapsuleModule), [[041-capability-injection|ADR 041]].

## Purpose

**Stateful feature-packages — «мини-апп как пакет».** Каждый domain-пакет инкапсулирует вертикаль: свой UI + services + controllers + entities + registry. Опционально с собственными providers, но всё внутри пакета.

Domain-пакет обязан удовлетворять четырём инвариантам:

1. **Self-contained vertical.** Внутри пакета есть всё, что нужно для feature: UI-блоки (`/ui`), HCA-controllers (`/controllers`), entities, контракты с runtime'ом. Apps просто подключают пакет.
2. **Параметризуем по subpath-блокам или axis-стратегиям.** Например, `web-auth` параметризуется по стратегии (role/credentials/oauth2/qr) через subpath. Это — feature-разнообразие в одном пакете, не зоопарк подобных пакетов.
3. **No horizontal imports** (ADR 047 D2). Domain-X НЕ импортит domain-Y. Если нужно — через контракт в `web-contract`.
4. **ADR 033 manifest.** Domain-пакет регистрирует свои capabilities через `defineCapsuleModule` (`capsule.ts`) — apps composite через registry, не через прямые импорты.

## Packages

| Package | npm | Status | One-line |
|---|---|---|---|
| `web-auth` | `@capsuletech/web-auth` | scaffold | Auth domain: вход/сессия/формы. Параметризуется по оси стратегии (role/credentials/oauth2/qr). |
| `web-shell` | `@capsuletech/web-shell` | alpha | App-shell блоки: chrome (header, layout). Tier-2 поверх stateless web-ui. После ADR 046 Matrix эвакуируется отсюда → `boost-matrix`. |
| `web-agent` | `@capsuletech/web-agent` | scaffold | Встраиваемый агент: LLM-чат + tool-calling. Параметризуется по 3 осям (транспорт/тулсет/персона). Говорит с `backend/scriber` по HTTP/SSE. |

## Import rules

```
domain → kit (можно)
domain → runtime (можно)
domain → boost (можно — domain widget может использовать boost-table и т.д.)
domain ↛ domain (FORBIDDEN — это canon, см. ADR 047 D2)
domain ↛ studio
```

**Domain ↔ domain — НИКОГДА.** Это canon. Если `web-shell` нужен `is-authed?` от `web-auth`:

1. Контракт `IAuthCapability` живёт в `@capsuletech/web-contract/auth`.
2. `web-shell` импортит **только тип** из контракта, не impl.
3. `web-auth` РЕАЛИЗУЕТ контракт + регистрирует capability через `defineCapsuleModule`.
4. App-уровень соединяет: registry → capability-инъекция в shell через ADR 041 services.

Compliance enforces: domain → другой domain напрямую = warning. Контракт-импорт — OK.

## Canonical shape

Структура типичного domain-пакета:

```
packages/web/domain/<name>/
  src/
    index.ts              ← главный entry — re-exports public API
    capsule.ts            ← ADR 033 manifest (defineCapsuleModule)
    types.ts              ← public types
    services/             ← stateful logic, side-effects
      <name>Service.ts
    controllers/          ← HCA controllers (FSMs) — ADR 032 useEmit pattern
      <name>Controller.ts
    ui/                   ← UI-блоки (subpath /ui)
      <feature>Form.tsx
    <strategy-1>/         ← subpath блок (опц.) — например auth/role
      index.ts
    <strategy-2>/         ← auth/credentials
      index.ts
  package.json            ← exports field — namespace subpaths
  OWNERSHIP.md
  README.md
  capsule.ts              ← если CLI-managed
```

Признаки канона:

- **`capsule.ts` manifest** — ADR 033 регистрирует пакет в global registry; apps композитят через registry.
- **`/controllers` subpath** — HCA-адаптер, рассказывающий аппу «как реагировать на события пакета» через `useEmit` ([[adr032-package-controllers]]).
- **`/ui` subpath** — UI-блоки, которые app может встроить или подменить.
- **Strategy axis через subpath** — НЕ создаём `web-auth-role` + `web-auth-credentials` как отдельные пакеты; один пакет с subpath'ами.
- **Контракт capability** — domain экспортит interface (или потребляет из web-contract), реализует, регистрирует через `defineCapsuleModule.capabilities`.

Пример event-flow в app'е (ADR 032 + ADR 047 D2):

```tsx
// apps/<app>/src/features/auth.ts
import type { AuthEvents } from '@capsuletech/web-auth';

export default Feature<AuthEvents>(({ router, authApi }) => ({
  initial: 'idle',
  states: {
    idle: {
      // Named events from web-auth — NOT generic onClick + tags.
      onLogin: async ({ payload }) => { /* ... */ },
      onLogout: async () => { /* ... */ },
      onError: async ({ payload }) => { /* ... */ },
    },
  },
}));
```

## Vendor stack

Domain-пакеты в основном используют **runtime-пакеты как abstraction**, прямые вендоры — мало (через runtime).

Возможные прямые вендоры:

- **Solid.js** — реактивный фреймворк.
- **Domain-specific вендоры** — например `web-agent` тянет SSE-клиент для backend/scriber, `web-auth` может тянуть OAuth-flow библиотеку.

Документация upstream — per-package в OWNERSHIP.md.

## Non-goals

Domain **не делает**:

- ❌ Импорт другого domain'а. Если соблазн → контракт в `web-contract`.
- ❌ Глобальное состояние без provider'а. Domain-state живёт за provider'ом домена.
- ❌ Hardcode конкретного app'а. Domain должен быть consumable любым capsule-аппом — параметризация через ADR 041 services / props.
- ❌ Heavy движок mirror'а. Если домену нужен virtualized table — он импортит `boost-table` (downward), не реализует свой.
- ❌ Editor-функциональность. Domain даёт `<LoginForm>`; редактор формы — это studio (`studio`).
- ❌ Прямой fetch. Все API-calls через `web-query` (runtime); endpoint'ы декларируются через `defineEndpoint`.

## New package — checklist

Добавление domain-пакета — **архитектурное решение**. Перед PR'ом:

1. Открыть дискуссию с главным assistant'ом — это правда новая vertical, не subpath существующего?
   - `web-billing`? `web-onboarding`? `web-search`? — каждый кандидат должен пройти триаж.
   - Если features общие с существующим domain → subpath там.
2. Если новый пакет одобрен:
   - Path config: `tsconfig.base.json` + `optimizeDeps.exclude` + Vite-builder rebuild.
   - `OWNERSHIP.md`:
     - «Состояние» секция (status / priority / blockers / roadmap).
     - **«Allowed dependency zones» секция** (обязательно для domain): явно перечисляет `kit, runtime, boost` + контракты. Без «другой domain».
     - «Vendor stack» секция.
   - `README.md` (minimum usage).
   - AI-anchor `docs/_meta/<name>.md`.
   - `capsule.ts` manifest — ADR 033 регистрация capabilities + UI-блоков.
   - `/controllers` subpath — ADR 032 useEmit pattern.
3. Контракты:
   - Если нужны capabilities другого domain'а → создать контракт в `web-contract` (или domain-specific contract package `web-<name>-contract`).
   - Контракт **только types/interfaces**, no impl.
4. ADR обязателен, если новый домен меняет архитектуру (новая ось параметризации, новый capability в global registry).
5. Owner-агент `.claude/agents/owner-web-<name>.md` ([[owner-agent-canon]]).

## Related

- [[web-auth]], [[web-shell]], [[web-agent]] — per-package AI-anchors.
- [[web-zone-kit]] — domain ИМЕЕТ право импортить kit.
- [[web-zone-runtime]] — domain ИМЕЕТ право импортить runtime.
- [[web-zone-boost]] — domain ИМЕЕТ право импортить boost (downward).
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D2 — no horizontal canon.
- [[033-package-registration|ADR 033]] — defineCapsuleModule manifest.
- [[041-capability-injection|ADR 041]] — capability injection.
- [[adr032-package-controllers]] — `/controllers` subpath + useEmit pattern.
