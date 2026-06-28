---
name: "@capsuletech/web-router"
owner-agent: owner-web-router
group: web_base
zone: runtime
status: stable
priority: P0
last-updated: 2026-06-11
---

# OWNERSHIP — @capsuletech/web-router

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — Context-based обёртка над `@tanstack/solid-router` (ADR 003). `createRouter` factory + `useRouter` hook + `ICapsuleRouter` контракт + `RouterProvider` re-export.
- **Status:** `stable` (0.1.1) — `goTo` / `back` / `current` / `raw` API; PR #298 добавил `useRouteDepth` (impl переписывается в Phase C1).
- **Priority:** **P0** — основа routing-слоя.
- **Maturity bar (до 1.0):**
  - **Phase C1** (IN PROGRESS, owner-web-router dispatched) — `CapsuleOutlet` + `DepthContext` + `useRouteDepth` rewrite per [[046-boost-namespace-matrix-evict-vt-owner|ADR 046]] D4.
  - SSR readiness (current() с search/hash).
  - Module augmentation для typed routeTree.
- **Active blockers:** нет (Phase C1 в полёте).
- **Roadmap:**
  1. C1 — CapsuleOutlet rewrite (USER dispatched).
  2. C2 — Ui.Outlet swap координация с web-core.
  3. ICapsuleRouter SSR-ready.
- **Last activity:** 2026-06-11 (canon refresh; Phase C1 dispatched).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@tanstack/solid-router`** (peerDep) — main router engine. https://tanstack.com/router/
- **`@tanstack/router-core`** (peerDep) — core router primitives. https://tanstack.com/router/

**В чужие пакеты не лезем.** Изменения в `web-core`, `builders`, `apps/*` — через главного.

## Публичный API

```ts
// Фабрика
createRouter<TRouteTree>({
  routeTree,
  context?,
  basepath?,          // URL-префикс под-пути раздачи (e.g. '/ewc')
  notFoundRedirect?,  // путь редиректа при 404; undefined → дефолтный экран TanStack
  beforeLoad?,        // глобальный guard (auth, roles, maintenance) — ADR 030
  viewTransition?,    // нативный View Transitions API (TanStack defaultViewTransition); дефолт false
}): { raw: TanStackRouter<TRouteTree>; capsuleRouter: ICapsuleRouter<TRouteTree> }

// Hooks
useRouter(): ICapsuleRouter        // бросает вне Provider'а
useRouteDepth(): Accessor<number>  // глубина текущего Outlet'а (root=0, вложенный=1, …) — ADR 046 D4 (impl: useContext(DepthContext))

// ComponentsPalette
CapsuleOutlet: () => JSX.Element   // wrapper над TanStack <Outlet/> + DepthContext.Provider + DOM с view-transition-name (per-depth уникальное имя) + view-transition-class: capsule-route (depth-agnostic CSS-таргетинг, ADR 046 D4)

// Context
DepthContext: Context<number>      // per-Outlet depth, sentinel -1 = "над любым Outlet'ом" (ADR 046 D4)

// Types
ICapsuleRouter<TRouteTree>    // { goTo, back, current, raw }
ICapsuleRouterContext<TUser>  // TUser & { [k]: unknown }
IGoToOpts                     // { params?, search?, hash?, replace? }
IBeforeLoadContext            // { location, cause, params, search, context, preload, abortController }
ICreateRouterOpts<TRouteTree> // { routeTree, context?, basepath?, notFoundRedirect?, beforeLoad?, viewTransition? }
TanStackRouter                // re-export @tanstack/solid-router
AnyRoute                      // re-export @tanstack/router-core
redirect                      // re-export @tanstack/solid-router (для throw redirect(...))
notFound                      // re-export @tanstack/solid-router (для throw notFound())
```

### Методы ICapsuleRouter

| Метод | Сигнатура | Поведение |
|---|---|---|
| `goTo` | `(path, opts?) => void` | `raw.navigate({ to: path, ...opts })` |
| `back` | `() => void` | `raw.history.back()` |
| `current` | `() => string` | `raw.state.location.pathname` — app-relative (TanStack стрипает basepath через input-rewrite) |
| `raw` | property | Escape hatch к TanStack Router |

## Файлы

| Файл | Что |
|---|---|
| `src/types.ts` | `wrap()`, `normalizeBase()`, все типы (включая `IBeforeLoadContext`, `ICreateRouterOpts`). Type-only импорт TanStack — секрет node-env тестов. |
| `src/service.ts` | `createRouter()` — value-импорт `@tanstack/solid-router`, проводит `notFoundRedirect`, `beforeLoad`, `viewTransition` |
| `src/context.ts` | `RouterContext` + `useRouter()` hook |
| `src/index.ts` | barrel + ре-экспорт `redirect`/`notFound` из `@tanstack/solid-router` |
| `src/useRouteDepth.ts` | `useRouteDepth()` — `useContext(DepthContext)`, normalize sentinel `-1`→`0` (ADR 046 D4) |
| `src/depthContext.ts` | `DepthContext` — Solid-context для per-Outlet depth (sentinel `-1`) |
| `src/CapsuleOutlet.tsx` | `CapsuleOutlet` — wrapper над TanStack `<Outlet/>`, владеет `view-transition-name: capsule-content-${depth}` (per-depth, для разделения регионов) + `view-transition-class: capsule-route` (depth-agnostic CSS-таргетинг — `::view-transition-*(.capsule-route)` матчит любую глубину, никакого hardcoded потолка) (ADR 046 D4). **Trace-инструментация (ADR 062):** эмиттит `router.route` mount/dispose `{ depth, path }` через `@capsuletech/web-profiler/trace` (no-op когда off). Трейсит OUTLET-узел (структурная глубина), НЕ matched leaf-компонент (его рендерит TanStack внутри `<Outlet/>`). |
| `src/__tests__/` | 51 тест: wrap (14), normalizeBase (8), context (2), notFoundRedirect (5), beforeLoad (6), viewTransition (4), useRouteDepth (5 Provider-based), CapsuleOutlet (4 DOM), CapsuleOutlet.trace (3 mount/dispose/soft-dep) — jsdom-env |

## Ключевые инварианты

- `wrap()` — в `types.ts`, не в `service.ts`. Иначе value-импорт TanStack ломает node-env тесты.
- `current()` возвращает **app-relative** pathname. При `basepath: '/ewc'` браузерный `/ewc/dashboard` → TanStack отдаёт `/dashboard` через input-rewrite `rewriteBasepath`. Вручную стрипать в `wrap()` не нужно.
- `normalizeBase('/ewc/')` → `'/ewc'`; `normalizeBase('/')` → `undefined`. Корень не задаёт `basepath` в TanStack.
- `back()` — через `raw.history.back()`, не `window.history`.
- `useRouter()` бросает вне Provider'а — намеренно. Soft-dep → `useContext(RouterContext)` напрямую.

## Известные грабли

Полный список в `docs/_meta/web-router.md` (10 пунктов). Критичные:
1. `useRouter()` бросает вне Provider — для soft-dep (Storybook, тесты) → `useContext(RouterContext)` + null-check.
2. `current()` реактивен через TanStack Solid-store — не кэшировать в `const` вне реактивного контекста.
3. `goTo()` принимает options-объект `{ params, search, hash, replace }` (ADR 014).
4. `ICapsuleRouterContext` — generic (ADR 014), `isAuthenticated` не в default-shape.

## ADRs

- ADR 003 — Context-based роутер
- ADR 014 — `goTo` opts-object + generic `ICapsuleRouterContext`
- ADR 030 — `notFoundRedirect` + generic `beforeLoad`-хук
- ADR 045 #3 — depth-scoped `view-transition-name` (foundation, реализация заменена)
- ADR 046 Decision 4 — `CapsuleOutlet` владеет vt-name; `useRouteDepth` impl на `useContext(DepthContext)` (signature сохранён)
- ADR 062 — runtime observability trace-канал; `CapsuleOutlet` несёт постоянную `router.route` mount/dispose инструментацию (dep `@capsuletech/web-profiler`)

## Release group

`web_base` (fixed-versioning, tag `web@{version}`). Соседи: web-core (главный consumer), web-state, web-style, web-ui, и др.
