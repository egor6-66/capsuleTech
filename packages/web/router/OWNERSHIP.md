# OWNERSHIP — @capsuletech/web-router

## Зона ответственности

Context-based обёртка над `@tanstack/solid-router`. Предоставляет `ICapsuleRouter` API и инжектирует его через Solid Context. Инстанс роутера создаётся в `web-core/BaseProviders` и передаётся в Feature/Controller через `services.router`.

**В чужие пакеты не лезем.** Изменения в `web-core`, `builders`, `apps/*` — через главного.

## Публичный API

```ts
// Фабрика
createRouter<TRouteTree>({
  routeTree,
  context?,
  basepath?,       // v0.1.1+: URL-префикс под-пути раздачи (e.g. '/ewc')
}): { raw: TanStackRouter<TRouteTree>; capsuleRouter: ICapsuleRouter<TRouteTree> }

// Hook
useRouter(): ICapsuleRouter   // бросает вне Provider'а

// Types
ICapsuleRouter<TRouteTree>    // { goTo, back, current, raw }
ICapsuleRouterContext<TUser>  // TUser & { [k]: unknown }
IGoToOpts                     // { params?, search?, hash?, replace? }
ICreateRouterOpts<TRouteTree> // { routeTree, context?, basepath? }
TanStackRouter                // re-export @tanstack/solid-router
AnyRoute                      // re-export @tanstack/router-core
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
| `src/types.ts` | `wrap()`, `normalizeBase()`, все типы. Type-only импорт TanStack — секрет node-env тестов. |
| `src/service.ts` | `createRouter()` — value-импорт `@tanstack/solid-router`, вызывает `normalizeBase` |
| `src/context.ts` | `RouterContext` + `useRouter()` hook |
| `src/index.ts` | barrel |
| `src/__tests__/` | 22 теста: wrap (14), normalizeBase (8), context (2) — node-env без jsdom |

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

## Release group

`web_base` (fixed-versioning, tag `web@{version}`). Соседи: web-core (главный consumer), web-state, web-style, web-ui, и др.
