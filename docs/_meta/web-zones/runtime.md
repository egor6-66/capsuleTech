---
title: web-zone-runtime
description: Canon для zone `runtime` — framework-сервисы, включённые в каждое capsule-приложение под капотом (HCA wrappers, state, router, query, styling, ...). Source of truth о scope, импорт-правилах, vendor-stack.
status: canon
last_updated: 2026-06-11
---

# Zone: runtime

> Физическая директория: `packages/web/runtime/` (после Phase D миграции; на момент 2026-06-11 — плоский `packages/web/{core,state,router,query,style,...}/`).
>
> Канон-источники: [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1 (zones) + D2 (no horizontal between domain) + D3 (vendor transparency).

## Purpose {#purpose}

**Framework-сервисы и инфраструктура, включаемые в каждое capsule-приложение под капотом.** То, без чего capsule-апп не запустится: HCA-wrapper'ы, FSM-обвязка, router, fetch-стек, styling-слой, registry, profiler.

Runtime-пакет обязан удовлетворять трём инвариантам:

1. **Provider-shape.** Большинство runtime-пакетов экспортит provider + hook + (опц.) синглтон. Пример: `<RouterProvider>` + `useRouter()` + `routerService`.
2. **Reusable across all apps.** Никакой domain-специфики. Если функциональность нужна только `web-auth` — это domain, не runtime.
3. **HCA-aware where relevant.** `web-core` — единственный пакет, который реализует HCA-wrapper'ы; остальные runtime-пакеты могут быть consumed внутри HCA-слоёв (controllers/features) через `services.*` injection.

## Packages {#packages}

| Package | npm | Status | One-line |
|---|---|---|---|
| `web-core` | `@capsuletech/web-core` | stable | Сердце фреймворка: 6 HCA wrapper'ов (Entity/Widget/Page/Controller/Feature/Shape), UiProxy, ControllerProxy, BaseProviders, slot-registry. |
| `web-state` | `@capsuletech/web-state` | stable | XState-обвязка: `createState` (FSM factory) + `createBridge` (геттер-обёртка + tag-helpers). |
| `web-router` | `@capsuletech/web-router` | stable | Context-обёртка над `@tanstack/solid-router`: `createRouter` + `useRouter()` + `ICapsuleRouter` контракт. |
| `web-query` | `@capsuletech/web-query` | stable | Декларативный API-слой: `defineEndpoint` + koa-style middleware + typed error hierarchy + `setApiClient`. |
| `web-style` | `@capsuletech/web-style` | stable | Styling: `createStyle` (CVA-wrap), `cn`/`merge`, темы (CSS), `STATUS_VARIABLES`. Subpath `/themes` + `/css` отдают сырые CSS. |
| `web-renderer` | `@capsuletech/web-renderer` | beta | Runtime для рендера UI по JSON-схеме (ISchema → Solid JSX). Обобщённый Widget. |
| `web-dnd` | `@capsuletech/web-dnd` | stable | Pointer-based drag-and-drop: `DnDProvider` + `createDraggable`/`createDroppable`/`createSortable` + `DragOverlay`. |
| `web-intl` | `@capsuletech/web-intl` | alpha | Интернационализация — провайдер, локали, форматтеры. |
| `web-date` | `@capsuletech/web-date` | alpha | Date/time утилиты + форматтеры. |
| `web-profiler` | `@capsuletech/web-profiler` | beta | Performance-мониторинг: 13 collectors (Web Vitals/Memory/FPS/...) + reporters + `ProfilerDashboard` widget. |
| `web-remote` | `@capsuletech/web-remote` | scaffold | Module Federation alternative: pluggable transport + manifest-driven. Phase 0 — только контракты. |
| `web-contract` | `@capsuletech/web-contract` | scaffold | Leaf-протоколы для domain↔domain coordination (ADR 047 D2). Контракты, без impl. |
| `web-access` | `@capsuletech/web-access` | scaffold | RBAC/permissions — abilities, guards. |

## Import rules {#import-rules}

```
runtime → kit (можно)
runtime → runtime (можно, без циклов — compliance ловит)
runtime ↛ domain/*
runtime ↛ boost/*
runtime ↛ studio/*
```

**Что runtime-пакет может импортить:**

- `solid-js` (peerDep).
- `@capsuletech/web-style` — токены, `createStyle` (если нужен styling).
- `@capsuletech/web-ui` — kit-примитивы (если runtime-пакет имеет UI; например `web-profiler` использует `Ui.Card`).
- Другой `@capsuletech/web-<runtime>` пакет — БЕЗ циклов (compliance проверяет).
- Вендоры (XState, TanStack Router/Query, Kobalte, и т.п.) — открыто и transparent.

**Что runtime-пакет НЕ импортит:**

- `@capsuletech/web-auth`, `web-shell`, `web-agent` — domain.
- `@capsuletech/boost-*` — boost.
- `@capsuletech/studio` (и его subpath'ы) — studio.

Compliance enforces: runtime → domain/boost/studio = wrong layer (warning).

## Canonical shape {#canonical-shape}

Типичный runtime-пакет экспортит **Provider + hook + (опц.) singleton/factory** под HCA-канон.

```tsx
// packages/web/runtime/router/src/provider.tsx
import { createContext, useContext, type Component, type JSX } from 'solid-js';
import type { ICapsuleRouter } from './types';

const RouterContext = createContext<ICapsuleRouter>();

export const RouterProvider: Component<{ router: ICapsuleRouter; children: JSX.Element }> = (p) => (
  <RouterContext.Provider value={p.router}>{p.children}</RouterContext.Provider>
);

export const useRouter = (): ICapsuleRouter => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within <RouterProvider>');
  return ctx;
};

// Capsule-typed контракт поверх loosely-typed вендора (ADR 047 D3 — wrapper c reason)
// Reason: HCA-bridge для router-injection в Feature через services.router.
export interface ICapsuleRouter {
  goTo(path: string, opts?: IGoToOpts): void;
  back(): void;
  current(): ICurrent;
  raw: TanstackRouter;
}
```

Признаки канона:
- Provider+hook вокруг Context (capsule-canon — Context-based, не глобальный синглтон без provider'а; ADR 003).
- Capsule-typed контракт обязателен если вендор loosely typed (`raw` поле для escape-hatch).
- Wrapper-комментарий с reason (ADR 047 D3 vendor transparency).
- HCA-injection: provider маунтится в `BaseProviders` (`@capsuletech/web-core`), сервис инжектится в Controllers/Features через `services.*`.

## Vendor stack {#vendor-stack}

Главные вендоры зоны (per-package детали — в OWNERSHIP.md каждого):

- **Solid.js** (`^1.9.12`) — реактивный фреймворк.
- **XState** (`^5`) — FSM движок (используется `web-state` + `web-core`).
- **`@tanstack/solid-router`** (`^1`) — router (используется `web-router`).
- **`@tanstack/solid-query`** (`^5`) — кэш слой (используется `web-query`).
- **`zod`** (`^4`) — schema-validation (используется через `@capsuletech/shared-zod`).
- **Tailwind v4** (`^4.2`) — styling (используется `web-style`).
- **`@kobalte/core`** (`^0.13`) — a11y-headless (используется `web-ui`, может быть consumed runtime'ом).

Документация upstream:
- XState → https://stately.ai/docs
- TanStack → https://tanstack.com/
- Solid → https://solidjs.com/
- Zod → https://zod.dev/

## Non-goals {#non-goals}

Runtime **не делает**:

- ❌ Domain-логику. Auth-flow, shell-chrome, agent-chat — это domain.
- ❌ Heavy domain-mirror'ы. Если нужен virtualized table — это boost (`boost-table`), не runtime.
- ❌ Design-time tooling. Editor, palette, inspector — это studio (`studio`).
- ❌ App-specific bootstrap. Конкретный `App.tsx` живёт в `apps/<app>/src/`, не в runtime.
- ❌ HCA-wrappers вне `web-core`. Только `web-core` реализует `Entity/Widget/Page/Controller/Feature/Shape`; остальные runtime-пакеты consume их.

## New package — checklist {#new-package-checklist}

1. Решить: точно runtime, не другая zone?
   - Это **сервис нужный КАЖДОМУ capsule-аппу**? → runtime.
   - Только одному типу аппа → domain.
   - Heavy движок mirror'ит kit-примитив → boost.
   - Design-time-only → studio.
2. Path config:
   - `tsconfig.base.json` paths (`@capsuletech/web-<name>` → `packages/web/runtime/<name>/src/index.ts`).
   - `optimizeDeps.exclude` в `vite-builder/src/defines/capsuleConfig.ts`.
   - Vite-builder rebuild (`pnpm --filter @capsuletech/vite-builder build`) — иначе dev-сервер pre-bundle'нёт workspace-пакет (см. CLAUDE.md «Aliasing» грабли).
3. Артефакты пакета:
   - `OWNERSHIP.md` по [[OWNERSHIP-template]] (обязательно: «Состояние» + «Vendor stack»).
   - `README.md` по [[readme-template]] (minimum usage 5-10 строк).
   - AI-anchor `docs/_meta/<name>.md`.
   - `package.json`: peerDeps вместо deps для всего что shar'ится в апп.
4. Registry:
   - Release-group `web_base` в `scripts/release-local.mjs`.
   - Owner-агент `.claude/agents/owner-<name>.md` ([[owner-agent-canon]]).
5. HCA-integration (если применимо):
   - Provider маунтится в `BaseProviders` (web-core) — координация с owner-web-core.
   - Сервис экспортируется в `Feature` через `services.<name>` — типы в `web-core/wrappers/interfaces.ts`.

## Related {#related}

- [[web-core]], [[web-state]], [[web-router]], [[web-query]], [[web-style]], [[web-renderer]], [[web-dnd]], [[web-profiler]] — per-package AI-anchors.
- [[web-zone-kit]] — kit зависит ТОЛЬКО на web-style оттуда; runtime ИМЕЕТ право импортить kit.
- [[web-zone-domain]] — domain ИМЕЕТ право импортить runtime; runtime НЕ зависит на domain.
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1 + D3.
- [[033-package-registration|ADR 033]] — `defineCapsuleModule` для domain/boost регистрации (runtime — провайдеры через web-core BaseProviders, а не через manifest).
