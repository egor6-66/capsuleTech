---
name: "@capsuletech/web-query"
owner-agent: owner-web-query
group: web_base
status: pre-1.0
last-updated: 2026-05-22
---

# @capsuletech/web-query

Декларативный API-слой capsule: `defineEndpoint` (zod-typed endpoint factory) + koa-style middleware pipeline между Feature и сетью + typed error hierarchy + `setApiClient/getApiClient` (инжектится в `services.api` в Feature через `web-core/createLogicWrapper`). Vite-плагин (`EndpointsRegistryPlugin`) auto-discover'ит endpoints и генерит `.capsule/@types/api.d.ts` для interface-merging'а в `CapsuleApi`. Subpath `/app-config` экспортит `defineAppConfig` + `IAppConfig` (ADR 011/013).

## Зона ответственности

### Owns

- `packages/web/query/src/` (полностью)
- `packages/web/query/src/middleware/` — built-in middleware (core: validate/build/transport/preRequestHook; user: cookies/auth/log/retry/on401/statusMapper)
- `packages/web/query/src/__tests__/` — все unit-тесты пакета
- `packages/web/query/src/app-config.ts` — `defineAppConfig` + `IAppConfig` subpath
- `packages/web/query/src/devOnly.ts` — tree-shake helper для `preRequest` и пр.
- `packages/web/query/vite.config.mts` — build config (два entrypoint'а: `index` + `app-config`)
- `packages/web/query/vitest.config.ts`
- `packages/web/query/package.json` — exports / deps / peerDeps

### Не трогает

- Содержимое других `@capsuletech/*` пакетов (делегировать соответствующим owner'ам).
- `EndpointsRegistryPlugin` в `packages/builders/vite/src/plugins/` (owner-builders).
- `apps/*/.capsule/@types/api.d.ts` — генерируется builders-плагином, ручной правки не нужно (owner-builders для шаблонов).
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant).
- `apps/*/` (user / framework-developer scope).
- `scripts/release-local.mjs` и подобные shared infra (главный assistant).

## Публичный API

Два subpath-экспорта через `package.json.exports`:

### `.` — main barrel (`src/index.ts`)

```ts
import {
  // фабрики
  defineEndpoint, createApi,
  // singleton-injectors
  setApiClient, getApiClient, setQueryClient, getQueryClient,
  // pipeline
  compose, type Middleware, type ApiContext,
  // namespace mw — built-in middleware
  mw,                              // { cookies, auth, statusMapper, on401, log, retry,
                                   //   buildRequest, httpTransport, mapDomain,
                                   //   preRequestHook, validateInput, validateResponse }
  // pre-request hook (NEW v0.2)
  devOnly, type PreRequest, type PreRequestCtx,
  // типы
  type Endpoint, type EndpointConfig, type InferInput, type InferOutput,
  type ApiConfig, type ApiConfigInput, type MwToolbox,
  type EndpointsRegistry, type InferApi, type RegistryNode,
  // client
  QueryClient, createQueryClient,
  type QueryClientOptions, type QueryState, type QueryKey,
  type HttpMethod, type RequestConfig, type FetchOptions, type MutateOptions,
  type Fetcher, defaultFetcher,
  type RequestInterceptor, type ResponseInterceptor, type ErrorInterceptor,
  // ошибки
  ApiError, HttpError, NetworkError, TimeoutError, ValidationError,
  UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ServerError,
} from '@capsuletech/web-query';
```

### `./app-config` (`src/app-config.ts`)

```ts
import { defineAppConfig, type IAppConfig } from '@capsuletech/web-query/app-config';
export default defineAppConfig({
  meta: { tags: ['button', 'input'] },
  aliases: { '@inputs': ['input', 'select'] },
  api: ({ mw }) => ({
    bases: { default: '/api' },
    middleware: [mw.cookies(), mw.statusMapper()],
  }),
});
```

Это **контракт**. Изменение публичного API = breaking change → bump major + координировать с главным.

## Quirks / gotchas

- **`validateInput` запускается ДО `preRequest`.** `ctx.input` внутри `preRequest`-хэндлера — уже zod-parsed (типа `ZOut<request>`). Источник: `src/createApi.ts:79-87`.

- **`setInput()` НЕ перевалидируется.** Caller-ответственность поддерживать корректный type. Если нужно перевалидировать после трансформации — вставь custom-middleware после `preRequestHook`. Источник: `src/middleware/core.ts > preRequestHook`.

- **`resolve(data)` пропускает `validateResponse` + `mapDomain`.** Caller передаёт **финальный domain shape** (не raw DTO). Mock-данные НЕ проверяются против `endpoint.response`-схемы — это намеренное design-решение, чтобы можно было быстро мокать без жёсткой типизации mock-fixtures. Источник: `src/middleware/core.ts > preRequestHook`.

- **`preRequest` — per-endpoint сахар над Middleware.** Для cross-endpoint логики (auth-header, retry, logging) используй `ApiConfig.middleware` или per-endpoint `EndpointConfig.middleware`. Не клонируй один и тот же `preRequest` по 10 endpoints — это сигнал что нужен middleware.

- **Phantom-type symbols `__input` / `__output` в `Endpoint<I, D>`.** Несут `I` и `D` через границы вызовов чтобы `createApi` мог их вывести в финальный тип. **НЕ удалять, НЕ менять** — без них `InferInput<E>` / `InferOutput<E>` сломаются. Источник: `src/endpoint.ts:36-47`.

- **Module-singleton `_api` в `createApi.ts`.** Per-app: каждый bundle имеет свой module-graph → свой singleton. В одном процессе isolation гарантируется build-time isolation'ом. SSR-readiness — отдельная тема (P3).

- **`setApiClient(api)` дёргается из generated `app-config.gen.ts`.** Manually-built test setup'ы (в `__tests__/createApi.test.ts`) делают это руками. Если `getApiClient()` возвращает `undefined` в runtime — забыли вызвать setter.

- **`defineAppConfig` живёт в `/app-config` subpath, НЕ в root.** Раньше был в `@capsuletech/web-core/interfaces.ts`, перенесён сюда чтобы `web-core` не зависел от `web-query` на уровне типов (cleanup-plan S-8).

- **`CapsuleApi` — пустой interface по умолчанию.** Расширяется через interface-merging из `apps/<app>/.capsule/@types/api.d.ts` (генерится `EndpointsRegistryPlugin`'ом). Без плагина `api.user.get(...)` не пропустит TS — это "API не настроен" кейс.

- **`staleTime` имеет смысл только на GET.** mutate (`POST`/`PUT`/`PATCH`/`DELETE`) — uncached. `httpTransport` дёргает `client.fetch` для GET (с cache-key) и `client.mutate` для остальных. Источник: `src/middleware/core.ts > httpTransport`.

- **`:param`-плейсхолдеры в `path`.** `buildRequest` подставляет из `ctx.input` по имени ключа; оставшиеся поля → `params` (GET/HEAD/DELETE) или `body` (POST/PUT/PATCH). Источник: `src/middleware/core.ts > buildRequest`.

- **`httpTransport` ловит non-`status` ошибки в `NetworkError`.** Ошибки с `.status` (от `defaultFetcher` через `HttpError`) пробрасываются as-is — `statusMapper` дальше конвертит. Источник: `src/middleware/core.ts > httpTransport`.

- **`compose` throws on двойной `next()` в одном mw.** Middleware-авторы НЕ должны вызывать `next()` дважды — это нарушение koa-протокола и индикатор бага. Источник: `src/pipeline.ts:42-53`.

- **`devOnly()` — tree-shake-only.** В test-env ВСЕГДА работает как passthrough (Vitest substitutes `import.meta.env.DEV` → `true` at transform time, мутация runtime не помогает). Поведение в prod-build верифицируется на уровне Vite-сборки apps. Источник: `src/devOnly.ts`.

## План рефакторинга / оптимизаций

- [ ] **Завести `docs/_meta/web-query.md` AI anchor** — pre-request реализация добавила новые контракты. (priority: high — closed by current PR)
- [ ] **Покрытие `pipeline.ts > compose` краевыми кейсами** — двойной `next()` + перехват exception во время downstream phase. (priority: medium)
- [ ] **SSR-готовность singleton'а `_api`** через Provider-scope (если apps пойдут в SSR). (priority: low)
- [ ] **Опциональная zod-проверка `resolve()`-данных против `endpoint.response`** — флаг `preRequest: { resolve, validate: true }`. Сейчас always-skip; добавлять только если будет реальный pain. (priority: low)
- [x] **`preRequest` hook + `devOnly` helper** — 2026-05-22, текущий PR.

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `src/__tests__/endpoint.test.ts` | `defineEndpoint` runtime shape + type inference (`InferInput`/`InferOutput`/`map`); preserve regression (включая `preRequest`) |
| Unit | `src/__tests__/createApi.test.ts` | namespace structure, ApiConfigInput resolution, e2e через mocked fetch, endpointName qualification, QueryClient publishing, setApiClient/getApiClient |
| Unit | `src/__tests__/cache.test.ts` | QueryClient cache: stale, invalidate, setQueryData |
| Unit | `src/__tests__/client.test.ts` | client.fetch/mutate, URL resolution через bases, params/body serialization |
| Unit | `src/__tests__/errors.test.ts` | error-hierarchy: ApiError + наследники |
| Unit | `src/__tests__/fetcher.test.ts` | defaultFetcher: HTTP-ошибки в HttpError, body-text capture |
| Unit | `src/__tests__/middleware-core.test.ts` | validateInput, buildRequest, httpTransport, validateResponse, mapDomain |
| Unit | `src/__tests__/middleware-user.test.ts` | cookies/auth/statusMapper/on401/log/retry |
| Unit | `src/__tests__/pipeline.test.ts` | `compose`-семантика koa-style |
| Unit | `src/__tests__/preRequest.test.ts` | preRequest: short-circuit, setInput, guards, async, ctx.endpoint, type-level |
| Unit | `src/__tests__/devOnly.test.ts` | dev-passthrough, undefined-env fallback (prod-ветка — через Vite-сборку apps) |
| E2E | `packages/cli/e2e/smoke.mjs` | косвенно: full prod-сценарий, app dev-server up |

**Перед изменением:** unit-tests должны быть green (`pnpm --filter @capsuletech/web-query test`).
**При breaking change в `EndpointConfig` или `ApiContext`:** обновить tests + добавить регрессионный.
**Перед release:** `pnpm test:e2e:cli` обязателен.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| zod schemas (CapsuleZ) | owner-shared-zod |
| Bridge + services injection в Feature | owner-web-core |
| EndpointsRegistryPlugin / AppConfigPlugin | owner-builders |
| Theme variables / createStyle | owner-web-style |
| Cli templates (capsule.app.ts boilerplate) | owner-cli |
| Tag-registry (aliases) — runtime registerAliases | owner-web-state |

## Release group

`web_base` — fixed-versioning, tag `web@{version}`. Соседи: web-core, web-dnd, web-editor, web-profiler, web-renderer, web-router, web-state, web-style, web-ui, shared-zod.

`web-query` — fundamental: каждое приложение использует через `services.api` в Feature. Breaking change в `EndpointConfig` / `ApiContext` / pipeline-order = breaking для всех Features. Bump major + согласуй со всеми owners web_base + apps.

После изменений в этом пакете — координировать release через главного (`scripts/release-local.mjs`).
