---
tags: [hca, package, router]
status: documented
---

# @capsuletech/web-router

**Расположение:** `packages/web/router/`
**Зависит от:** `@tanstack/solid-router`, `@tanstack/router-core`, `solid-js`

Тонкая обёртка над TanStack Solid Router: factory + Solid-context + публичный type-safe API. Реализация по [[003-router-context-based|ADR 003]].

## Файловая карта

```
packages/web/router/src/
├── index.ts         barrel
├── service.ts       createRouter() — value-импортит @tanstack/solid-router
├── types.ts         wrap() + ICapsuleRouter / ICreateRouterOpts / ICapsuleRouterContext
├── context.ts       RouterContext + useRouter()
└── __tests__/       wrap (7) + useRouter (2)
```

`wrap()` вынесена в `types.ts` отдельно от `createRouter()` сознательно — она делает только type-only import `@tanstack/solid-router`, благодаря чему весь pure-функционал тестируется в node-env без jsdom (`@tanstack/solid-router` value-import тянет CatchBoundary и прочие client-only Solid-API, которые падают на сервере).

## Публичный API

```ts
import {
  createRouter,
  useRouter,
  RouterContext,
  RouterProvider,
} from '@capsuletech/web-router';

import type {
  AnyRoute,
  ICapsuleRouter,
  ICapsuleRouterContext,
  ICreateRouterOpts,
  TanStackRouter,
} from '@capsuletech/web-router';
```

### `createRouter<TRouteTree>({ routeTree, context? })`

Фабрика. Создаёт TanStack-роутер и оборачивает в Capsule-API. Generic `TRouteTree` выводится из переданного `routeTree`:

```ts
const { raw, capsuleRouter } = createRouter({
  routeTree,
  context: { isAuthenticated: false },
});
```

- `raw` — экземпляр `TanStackRouter<TRouteTree>`, идёт в `<RouterProvider router={raw} />`.
- `capsuleRouter` — `ICapsuleRouter<TRouteTree>`, идёт в `<RouterContext.Provider value={...}>`.

`BaseProviders` делает оба шага сам — снаружи это не видно.

### `useRouter(): ICapsuleRouter`

Hook для доступа к Capsule-роутеру из компонента или wrapper'а. Бросает, если вне `<BaseProviders>` — это намеренно (silent-null опаснее явной ошибки).

```ts
import { useRouter } from '@capsuletech/web-router';

const router = useRouter();
router.goTo('/dashboard');
```

В `createLogicWrapper` это уже сделано — `services.router` приходит готовый.

> [!note]
> На уровне `useRouter()` generic `TRouteTree` не пробрасывается — здесь нет источника инференса. Если нужен типизированный `raw.navigate({ to })` — используйте `capsuleRouter.raw` из `createRouter` напрямую (там generic виден) или явно укажите тип переменной.

### `ICapsuleRouter<TRouteTree = AnyRoute>`

```ts
interface ICapsuleRouter<TRouteTree extends AnyRoute = AnyRoute> {
  goTo(path: string, params?: Record<string, unknown>): void;
  back(): void;
  current(): string;
  /** Escape hatch: TanStack-роутер напрямую — для редких use-case'ов */
  raw: RouterCore<TRouteTree, any, any, any, any>;
}
```

API специально **не** копирует все возможности TanStack — даёт стабильный контракт, не зависящий от внутренних изменений роутера. Для нестандартных случаев — `router.raw`.

- `goTo(path, params)` — `raw.navigate({ to: path, params })`. Цель типизируется как `string`, потому что `useRouter()` не имеет источника инференса (см. note выше).
- `back()` — `raw.history.back()`. Через TanStack-историю, а не `window.history.back()` напрямую — single-source-of-truth + проще к SSR.
- `current()` — `raw.state.location.pathname`. Реактивно (читается по требованию).
- `raw` — escape hatch. Когда `BaseProviders` параметризован конкретным `TRouteTree`, `raw.navigate({ to: '...' })` получит autocomplete по маршрутам.

### `RouterProvider`

Прямой re-export `@tanstack/solid-router` — нужен для рендера дерева роутов внутри `BaseProviders`.

### `AnyRoute`

Re-export `@tanstack/router-core` для default-bound пользовательских generic'ов. Например, `web-core/BaseProviders` задаёт `<TRouteTree extends AnyRoute = AnyRoute>` через этот тип.

## Подключение

Обычно — через `BaseProviders` из web-core:

```tsx
import { BaseProviders } from '@capsuletech/web-core/providers';
import { routeTree } from './routes/routeTree.gen';

<BaseProviders routeTree={routeTree} routerContext={{ isAuthenticated: false }} />
```

Если `routeTree` не передан — `BaseProviders` рендерит `props.children` без роутера (для unit-тестов компонентов вне роутера).

## Использование в Controller / Feature

```tsx
const Auth = Feature(({ router }) => ({
  initial: 'idle',
  states: {
    idle: {
      onClick: async ({ target }) => {
        const ok = await api.login(target.payload);
        if (ok) router.goTo('/dashboard');
      },
    },
  },
}));
```

`router` приходит автоматически через `services` из `createLogicWrapper`. API-сигнатура не меняется при будущих рефакторингах внутренностей роутера.

## Что **не** входит в `@capsuletech/web-router`

- API-клиент / fetch-обёртка — это уровень `@capsuletech/web-query`.
- Guards (`beforeLoad`, `loader`) — пишутся в TanStack-роутах напрямую (`.capsule/routes/__pages/...`).
- Sync с XState-стейтом контроллера — отдельная фича, если понадобится.

## Связанное

- [[003-router-context-based|ADR 003]]
- [[controller-proxy]]
- [[vite-plugins|RouterPlugin]]
