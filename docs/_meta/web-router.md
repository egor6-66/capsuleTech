---
tags: [meta, web-router, ai-context]
status: documented
type: ai-anchor
audience: claude
last_updated: 2026-06-14
---

# 🤖 Web Router — AI context anchor

> [!ai]
> Шпаргалка для Claude-инстансов. Без воды. Юзеру — [[router|router.md]].

## TL;DR {#tldr}

Context-based (ADR 003) обёртка над `@tanstack/solid-router`. Factory `createRouter({ routeTree, context? })` возвращает `{ raw, capsuleRouter }`. Hook `useRouter()` достаёт `ICapsuleRouter` из Context. Реактивное API: `goTo(path, opts?) / back() / current()`, где `opts = { params, search, hash, replace }` — прямой проброс в `raw.navigate`. Инжектится в Feature/Controller через `services.router`. `ICapsuleRouterContext<TUser>` — generic, app расширяет под свой shape (ADR 014).

**Routing-animation (ADR 046 Decision 4):** `CapsuleOutlet` — capsule-обёртка над TanStack `<Outlet/>` — владеет двумя view-transition-проперти:

- `view-transition-name: capsule-content-${depth}` (per-Outlet уникальное имя через `DepthContext.Provider value={parent+1}` — нужно чтобы вложенные Outlet'ы были РАЗНЫМИ snapshot-регионами; если бы имя было одинаковым, родители триггерились бы при свопе любого вложенного роута);
- `view-transition-class: capsule-route` (depth-agnostic CSS-таргетинг — web-style использует `::view-transition-*(.capsule-route)`, один селектор покрывает любую глубину без hardcoded потолка).

Эффект: каждый Outlet-уровень анимируется независимо, родители не триггерятся (их регионы рендерят одинаковый DOM до/после), CSS работает на любой глубине вложенности.

`useRouteDepth()` — публичный hook на `useContext(DepthContext)`, sentinel `-1` нормализуется в `0`. **Импортируется в `Ui.Outlet` (web-core ui-kit injection)** — apps дёргают через глобал `<Ui.Outlet/>`, не из web-router напрямую.

**Browser support:** `view-transition-class` — Chromium 125+ / Safari 18+. Firefox view-transitions не поддерживает, graceful degrade.

Тесты — jsdom-env с `vite-plugin-solid` (нужен для `CapsuleOutlet.test.tsx`). До ADR 046 пакет был node-only.

## Где что лежит {#layout}

| Файл | Что |
|---|---|
| `packages/web/router/src/index.ts` | barrel: переэкспорт `createRouter`, `useRouter`, `RouterContext`, `RouterProvider`, `AnyRoute`, `redirect`, `notFound` + типы |
| `packages/web/router/src/service.ts` | `createRouter<TRouteTree>({ routeTree, context?, notFoundRedirect?, beforeLoad? })` — фабрика, value-импорт TanStack |
| `packages/web/router/src/types.ts` | `wrap()` + типы (`ICapsuleRouter`, `ICreateRouterOpts`, `ICapsuleRouterContext`, `IBeforeLoadContext`) |
| `packages/web/router/src/context.ts` | `RouterContext` (Solid Context) + `useRouter()` hook с throw'ом вне Provider'а |
| `packages/web/router/src/depthContext.ts` | `DepthContext` — per-Outlet depth (sentinel `-1`) для view-transition-name (ADR 046 D4) |
| `packages/web/router/src/CapsuleOutlet.tsx` | `CapsuleOutlet` — wrapper над TanStack `<Outlet/>` + `DepthContext.Provider value={parent+1}` + DOM с `view-transition-name: capsule-content-${depth}` |
| `packages/web/router/src/useRouteDepth.ts` | `useRouteDepth()` — `useContext(DepthContext)` + `Math.max(0, depth)`-нормализация sentinel'а |
| `packages/web/router/src/__tests__/` | jsdom-env (CapsuleOutlet рендер): wrap+normalizeBase (22), useRouter (2), notFoundRedirect (5), beforeLoad (6), viewTransition (4), useRouteDepth (5 Provider-based), CapsuleOutlet (4 DOM) — 48 тестов |

## Public API {#public-api}

```ts
// Фабрика
createRouter<TRouteTree>({ routeTree, context?, basepath?, notFoundRedirect?, beforeLoad? }): {
  raw: TanStackRouter<TRouteTree>;
  capsuleRouter: ICapsuleRouter<TRouteTree>;
}

// Hook
useRouter(): ICapsuleRouter   // generic TRouteTree теряется (см. гочи)

// Types
ICapsuleRouter<TRouteTree>             // { goTo, back, current, raw }
ICapsuleRouterContext<TUser = {}>      // TUser & { [k: string]: unknown }
IGoToOpts                              // { params?, search?, hash?, replace? }
IBeforeLoadContext                     // { location, cause, params, search, context, preload, abortController }
ICreateRouterOpts<TRouteTree>          // { routeTree, context?, basepath?, notFoundRedirect?, beforeLoad? }
TanStackRouter                         // re-export @tanstack/solid-router Router
AnyRoute                               // re-export @tanstack/router-core
redirect                               // re-export @tanstack/solid-router (throw redirect(...))
notFound                               // re-export @tanstack/solid-router (throw notFound())
normalizeBase                          // pure helper: нормализует basepath для TanStack
```

### Методы `ICapsuleRouter`

| Метод | Сигнатура | Реализация |
|---|---|---|
| `goTo` | `(path: string, opts?: IGoToOpts) => void` | `raw.navigate({ to: path, ...opts })`. `opts = { params, search, hash, replace }` (ADR 014) |
| `back` | `() => void` | `raw.history.back()` — через TanStack, не `window.history` |
| `current` | `() => string` | `raw.state.location.pathname` — реактивно через Solid-store TanStack |
| `raw` | property | Escape hatch; типизирован если `BaseProviders` параметризован `routeTree` |

## Lifecycle flow {#lifecycle}

```
apps/<app>/bootstrap.tsx
  └─ <BaseProviders routeTree={routeTree} routerContext={{ isAuthenticated: ... }}>
       └─ createRouter({ routeTree, context })  →  { raw, capsuleRouter }
            ├─ <RouterContext.Provider value={capsuleRouter}>
            │   └─ useRouter()  // hook читает контекст
            └─ <RouterProvider router={raw} />
                 └─ Route-компоненты
                      └─ Controller/Feature через createLogicWrapper:
                           services.router = capsuleRouter
                           handler({ ..., services }) → router.goTo('/path')
```

## Известные грабли {#gotchas}

1. **`useRouter()` — auto-imported global в app-коде** (через `HOOK_IMPORTS` в `@capsuletech/vite-builder`, аналогично `useCtx`). В apps пишется без `import` — в Page/Widget/View прямо `const router = useRouter()`. **`useRouter()` бросает вне Provider'а** — явная ошибка вместо silent-null. Для soft-dep (Storybook, unit-тесты, переиспользуемые компоненты вне app-пайплайна) используй `useContext(RouterContext)` напрямую + null-check. Живой пример: `packages/web/ui/src/primitives/layout/switch.tsx:48`.

2. **`current()` реактивен — но через TanStack Solid-store, не через Capsule** — работает в JSX-getter (`<Animate keyed={router.current()}>`). НЕ кэшируй в `const` вне реактивного контекста — будет stale. В `createEffect` логику ставь внутри callback'а, не выноси в helper.

3. **`goTo()` принимает options-объект** (ADR 014) — `goTo(path, { params?, search?, hash?, replace? })`. Поля прямо мапятся в `raw.navigate({ to, ...opts })`. **Не путать со старой 2-arg формой** `goTo(path, params)` — она удалена, теперь `params` лежит внутри `opts`.

4. **`current()` возвращает только `pathname`** — без `?query` и `#hash`. Полный URL — `router.raw.state.location` (там `pathname` + `search` + `hash`).

5. **Generic `TRouteTree` теряется на `useRouter()`** — нет источника инференса. Решения: (a) явный cast `useRouter() as ICapsuleRouter<typeof routeTree>`, (b) `capsuleRouter` напрямую из `createRouter<T>(...)` (там generic виден). Module-augmentation паттерн TanStack `Register` — отдельный refactor (P3).

6. **`routerContext` обязан быть пробросан в `BaseProviders`, иначе guard'ы видят `undefined`** — если `__root.tsx` объявляет `MyRouterContext { isAuthenticated }`, а `<BaseProviders routerContext={...}>` пропущен, в `beforeLoad({context})` будет `context.isAuthenticated === undefined`. **На момент написания ни один из `apps/*` в репо не пробрасывает `routerContext`** — root-routes объявляют поле впустую. Не копипасти эту тишину, проверяй явный проброс.

7. **`ICapsuleRouterContext` — generic** (ADR 014): `<TUser extends object = {}>` → `TUser & { [k: string]: unknown }`. App пишет `ICapsuleRouterContext<{ isAuthenticated: boolean }>` или просто прокидывает объект — index signature разрешит «лишние» поля. `isAuthenticated?: boolean` больше **не** в default-shape, не путай со старым кодом до ADR 014.

8. **`wrap()` сидит в `types.ts`, не в `service.ts`** — сознательный split. `wrap` делает type-only импорт `@tanstack/solid-router` → тесты идут в node-env без jsdom. Value-импорт TanStack тянет `CatchBoundary` и прочие client-only Solid-API, падает на сервере. Не перетаскивай `wrap` в `service.ts`.

9. **`back()` идёт через `raw.history.back()`, не `window.history.back()`** — Single-source-of-truth от TanStack-истории. Готовит к SSR.

10. **`AnyRoute` ре-экспортнут именно из `@capsuletech/web-router`** — `web-core/BaseProviders` использует его как default-bound. НЕ импортируй `@tanstack/router-core` напрямую из web-core — это горизонтальный обход слоя.

11. **`basepath` нормализуется через `normalizeBase()`** — trailing slash убирается, пустая строка / `'/'` → `undefined` (корень). Передавать `import.meta.env.BASE_URL` напрямую без нормализации нельзя: Vite по умолчанию возвращает `'/'`, что привело бы к `basepath: '/'` в TanStack вместо отсутствия basepath.

12. **`current()` всегда app-relative, даже с basepath** — TanStack внутри запускает `rewriteBasepath` input-rewrite, который стрипает базовый путь из `location.pathname` до сохранения в store. Браузерный `/ewc/dashboard` при `basepath: '/ewc'` → `raw.state.location.pathname === '/dashboard'`. Вручную резать в `wrap()` не нужно.

13. **`beforeLoad` перезаписывает существующий хук на `routeTree`** — если `__root.tsx` уже объявляет `beforeLoad`, а `createRouter({ beforeLoad: appGuard })` задан — `appGuard` **заменит** route-хук. Если нужна составная логика (route-guard + app-guard) — объедини в одной функции в `capsule.app.ts`. Параллельная цепочка (`compose`) не поддерживается из коробки.

14. **`beforeLoad` применяется через `routeTree.options.beforeLoad`**, не через `.update()** — метод `.update()` принимает `UpdatableRouteOptions`, который не содержит `beforeLoad`. Прямая запись в `.options` корректна рантаймово и типово (`RouteOptions` включает `beforeLoad`). Cast `as any` на присвоении — обход несовместимости generic-параметра `TBeforeLoadFn` из `AnyRoute` с конкретным `IBeforeLoadContext`-колбэком.

15. **`redirect` и `notFound` — из `@capsuletech/web-router`**, не из `@tanstack/solid-router` напрямую. Ре-экспортируем, чтобы apps не пробивали абстракцию движка.

## Pattern: derived signals from location

`useLocation()` **without** `select` returns `() => router.stores.location.get()` — accessor but **without createMemo**. Solid sometimes inlines such as pure value → derived signals don't track.

`useRouterState({ select: s => s.location.pathname })` returns `Solid.createMemo(...)` — guaranteed tracking.

**Rule:** for derived/computed pathname use `useRouterState({ select })`.

Precedent: page-transition attempt in ewc 2026-05-28; `<Animate keyed={location().pathname}>` didn't work (likely mix of factors), `useRouterState({select})` fixed reactivity at least on that level.

## Что менять когда {#changes-guide}

| Хочу… | Куда лезть |
|---|---|
| Добавить новое поле в `IGoToOpts` (e.g. `state?`) | `packages/web/router/src/types.ts > IGoToOpts` + spread в `wrap().goTo` (поле уйдёт в `raw.navigate` автоматически). Расширение shape — нужен ADR. |
| Добавить новый метод в `ICapsuleRouter` (e.g. `replace(path)`) | `packages/web/router/src/types.ts > ICapsuleRouter` + реализация в `wrap()` |
| Расширить `current()` под search/hash | Сейчас только `pathname`. Альтернативы: добавить `location(): { pathname, search, hash }` или опцию `current({ search: true })`. Нужен ADR. |
| Дать typed `TRouteTree` в `useRouter()` | Module-augmentation TanStack `Register` — отдельный refactor (P3) |
| Интегрировать в SSR | `wrap().back()` уже на `raw.history`; в `createRouter` добавить history-injection |
| Использовать TanStack hooks напрямую (`useNavigate`, `useRouterState`) | НЕ надо — иди через `useRouter()` → `router.raw.*` (ADR 003 раздел B) |
| Пробросить `basepath` из `BaseProviders` в web-core | Задача `owner-web-core` — добавить `basepath?` проп в `BaseProviders` и передать в `createRouter`. `normalizeBase` уже в `web-router/types.ts`. |
| Пробросить `notFoundRedirect` из `BaseProviders` в web-core | Задача `owner-web-core` — добавить `notFoundRedirect?` проп в `BaseProviders` и передать в `createRouter`. Механизм уже реализован в `web-router/service.ts`. |
| Пробросить `beforeLoad` из `BaseProviders` в web-core | Задача `owner-web-core` — добавить `beforeLoad?` проп в `BaseProviders` и передать в `createRouter`. Та же цепочка что `notFoundRedirect`. |
| Добавить глобальный guard (auth, roles, maintenance) | `ICreateRouterOpts.beforeLoad` — колбэк `(ctx: IBeforeLoadContext) => void`. Бросает `redirect(...)` / `notFound()` из `@capsuletech/web-router`. Применяется на root-route через `routeTree.options.beforeLoad`. |

## Cross-links {#cross-links}

- User-doc: [[router]]
- ADRs: [[003-router-context-based]], [[014-router-api-extension]]
- Connected: [[controller-proxy]], [[core]], [[vite-plugins|RouterPlugin]]
