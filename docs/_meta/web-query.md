---
tags: [meta, web-query, ai-context]
status: documented
type: ai-anchor
audience: claude
last_updated: 2026-06-13
---

# Web Query — AI context anchor

> [!ai]
> Шпаргалка для Claude-инстансов. Без воды. Юзеру — [[query|query.md]] (если будет).

## TL;DR {#tldr}

Декларативный API-слой capsule. `defineEndpoint(({ zod, utils }) => config)` фабрика создаёт endpoint с zod-схемами `request`/`response` и опциональным `map(dto) → domain`. Factory получает объект инструментов `{ zod: CapsuleZ, utils: Utils }` — унифицированная конвенция capsule (аналогично Entity `({ zod })`, Controller/Feature `services`). `createApi(config, registry)` собирает typed-proxy `(input) => Promise<domain>` за каждый endpoint. Внутри — koa-style middleware pipeline (`compose`) с фиксированным порядком: `validateInput → preRequestHook → buildRequest → ...globalMw → httpTransport → validateResponse → mapDomain → ...endpointMw`. **`preRequest`** — typed-сахар для per-endpoint mock'инга / input-трансформации / business-rule-аборта (между validateInput и buildRequest). **`devOnly()`** — wrapper для tree-shake'a в prod-build (`import.meta.env.DEV`-based). `setApiClient(api)` публикует proxy в module-singleton, `getApiClient()` достаёт из `services.api` Feature'а. Subpath `/app-config` — `defineAppConfig`/`IAppConfig`.

## Где что лежит {#layout}

| Файл | Что |
|---|---|
| `packages/web/query/src/index.ts` | barrel: `defineEndpoint`, `createApi`, getters/setters, `mw`-namespace, `devOnly`, error-классы, типы |
| `packages/web/query/src/endpoint.ts` | `defineEndpoint` factory + `EndpointConfig`/`Endpoint`/`PreRequest`/`PreRequestCtx` types + phantom-symbols |
| `packages/web/query/src/createApi.ts` | pipeline assembly, `wrapEndpoint` (одна compose на endpoint), `setApiClient`/`getApiClient` singleton, `CapsuleApi` interface (merge-target) |
| `packages/web/query/src/pipeline.ts` | `ApiContext`, `Middleware`, `compose` (koa-style dispatcher) |
| `packages/web/query/src/middleware/core.ts` | built-in mw: `validateInput`, `preRequestHook`, `buildRequest`, `httpTransport`, `validateResponse`, `mapDomain` |
| `packages/web/query/src/middleware/user.ts` | user-facing mw: `cookies`, `auth`, `statusMapper`, `on401`, `log`, `retry` |
| `packages/web/query/src/client.ts` | `QueryClient` (cache + fetch/mutate), `createQueryClient`, getter/setter |
| `packages/web/query/src/cache.ts` | in-memory cache: get/set/invalidate (prefix-based) |
| `packages/web/query/src/fetcher.ts` | `defaultFetcher` (HTTP, throws `HttpError` с `bodyText` capture) |
| `packages/web/query/src/errors.ts` | error-hierarchy: `ApiError` + 9 subclass'ов |
| `packages/web/query/src/types.ts` | `RequestConfig`, `HttpMethod`, `Fetcher`, `QueryKey`, `FetchOptions`, `MutateOptions`, ... |
| `packages/web/query/src/app-config.ts` | `defineAppConfig` + `IAppConfig` (subpath `/app-config`) |
| `packages/web/query/src/devOnly.ts` | tree-shake helper `devOnly<T>(value): T \| undefined` |
| `packages/web/query/src/__tests__/` | 11 unit-test files, 179 tests (node-env, без jsdom) |

## Архитектура {#architecture}

```
apps/<app>/api/<namespace>/<endpoint>.ts
  └─ defineEndpoint(({ zod, utils }) => ({ method, path, request, response, map?, middleware?, preRequest? }))
        ↓ (export через `apps/<app>/.capsule/registry/endpoints.gen.ts`, генерится EndpointsRegistryPlugin'ом)
        ↓
apps/<app>/.capsule/registry/endpoints.gen.ts
  └─ export const endpoints = { user: { get, list }, post: { create } }
        ↓
apps/<app>/.capsule/app-config.gen.ts
  └─ const api = createApi(appConfig.api, endpoints)
     setApiClient(api)
        ↓
Feature((services) => ({ states: { idle: { onSubmit: ({ services }) => services.api.user.get({ id: '1' }) } } }))
                                                             ↑
                                            getApiClient() в createLogicWrapper
```

## Pipeline order

```
ctx: ApiContext { endpointName, config, client, input, request, response?, data?, meta }

[1] validateInput()      — zod.parse(input) против config.request, пишет в ctx.input
[2] preRequestHook()     — НОВОЕ: per-endpoint preRequest-хук. resolve(data) короткозамыкает в ctx.data.
[3] buildRequest()       — input → request: path-params substitution, body vs params split
[4] ...globalMw          — пользовательский middleware из ApiConfig (cookies, auth, statusMapper, log, retry)
[5] httpTransport()      — client.fetch (GET) или client.mutate (mutate), wraps errors в NetworkError
[6] validateResponse()   — zod.parse(response) против config.response
[7] mapDomain()          — config.map(response) → ctx.data
[8] ...endpointMw        — per-endpoint middleware (последняя обёртка, видит финальный ctx.data)
```

Если `preRequest` вызывает `resolve(data)` — шаги [3]-[7] **пропущены**, `ctx.data = data` напрямую, `endpointMw` (если есть) видит short-circuit'ed value.

## preRequest contract

См. `packages/web/query/src/endpoint.ts:9-65` (типы) + `packages/web/query/src/middleware/core.ts > preRequestHook` (реализация).

```ts
interface PreRequestCtx<I, D> {
  readonly input: I;             // уже zod-parsed
  setInput: (next: I) => void;   // мутирует ctx.input, НЕ ревалидирует
  resolve: (data: D) => void;    // short-circuit с финальным domain-shape
  reject: (err: unknown) => void;// short-circuit с throw'ом
  readonly endpoint: { readonly path: string; readonly method: HttpMethod };
}

type PreRequest<I, D> = (ctx: PreRequestCtx<I, D>) => void | Promise<void>;
```

Use cases:

```ts
// 1. Mock без сети
preRequest: ({ resolve }) => resolve({ id: 'mocked', email: 'a@b.c' })

// 2. Трансформация input
preRequest: ({ input, setInput }) => setInput({ ...input, q: input.q.trim() })

// 3. Conditional mock
preRequest: ({ resolve }) => { if (!localStorage.token) resolve([]); }

// 4. Business-rule abort
preRequest: ({ input, reject }) => {
  if (input.amount > 10_000) reject(new Error('amount too large'));
}

// 5. Async с utils.delay (доступен через EndpointTools в factory)
defineEndpoint(({ zod, utils }) => ({
  method: 'POST',
  path: '/auth/login',
  request: zod.object({ email: zod.string(), password: zod.string() }),
  response: zod.object({ token: zod.string() }),
  preRequest: async ({ resolve }) => {
    await utils.delay(700);
    resolve({ token: 'mock-token' });
  },
}))
```

Combined with `devOnly` для tree-shake:

```ts
preRequest: devOnly(({ resolve }) => resolve({ token: 'mock' })),
// В prod build весь handler + замыкание вырезаются Rollup'ом.
```

## devOnly contract

См. `packages/web/query/src/devOnly.ts`.

```ts
const devOnly = <T>(value: T): T | undefined => {
  const env = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  if (env && env.DEV === false) return undefined;
  return value;
};
```

- Vite dev: `import.meta.env.DEV === true` → возвращает `value`.
- Vite prod build: `import.meta.env.DEV === false` (inline constant) → constant-fold → `undefined` + Rollup DCE удаляет body `value`.
- Node-test без `import.meta.env`: passthrough (treat as dev).

**Важно для tree-shake'а:** проверку НЕ оборачивай в helper. Любая обёртка может пресечь constant-folding.

## defineAppConfig

Subpath `@capsuletech/web-query/app-config`. ADR 011/013.

```ts
import { defineAppConfig } from '@capsuletech/web-query/app-config';

export default defineAppConfig({
  meta: { tags: ['button', 'input', 'submit'] },         // → CapsuleTags type
  aliases: { '@inputs': ['input', 'select', 'textarea'] }, // → CapsuleAliases (whitelist `@`-литералов)
  api: ({ mw }) => ({
    bases: { default: '/api', cdn: 'https://cdn.example.com' },
    defaultHeaders: { 'Content-Type': 'application/json' },
    middleware: [mw.cookies(), mw.statusMapper(), mw.log()],
  }),
});
```

`AppConfigPlugin` (vite-builder) читает этот файл, кормит runtime-реестры (`registerAliases`) и генерит `.d.ts` с union'ами для строгой типизации `meta.tags`.

## Middleware catalog

### Built-in (core)

| MW | Когда | Что делает |
|---|---|---|
| `validateInput()` | step 1 | `endpoint.request?.safeParse(input)` → throws `ValidationError('request')` |
| `preRequestHook()` | step 2 (NEW) | Вызывает `config.preRequest` если задан. resolve/reject короткозамыкает |
| `buildRequest()` | step 3 | input → request: `:param`-substitution, body vs params split |
| `httpTransport()` | step 5 | `client.fetch` (GET) или `client.mutate` (mutate); wraps non-status errors в `NetworkError` |
| `validateResponse()` | step 6 | `endpoint.response?.safeParse(response)` → throws `ValidationError('response')` |
| `mapDomain()` | step 7 | `config.map(response)` → `ctx.data` |

### User-facing (`mw.*`)

| MW | Что делает |
|---|---|
| `mw.cookies()` | `credentials: 'include'` для cross-origin cookie session |
| `mw.auth({ token })` | Inject `Authorization: Bearer <token>` header |
| `mw.statusMapper()` | non-2xx response → typed error (Unauthorized/Forbidden/NotFound/Conflict/ServerError) |
| `mw.on401(handler)` | Catch `UnauthorizedError`, call handler (refresh-token pattern) |
| `mw.log({ level? })` | Console-log каждый endpoint-вызов (request/response/duration) |
| `mw.retry({ count, delay? })` | Retry на network/server-error, exponential backoff |

Custom middleware: `(ctx, next) => { /* pre */ await next(); /* post */ }`. `compose` следит за двойным `next()`.

## Errors hierarchy

См. `packages/web/query/src/errors.ts`.

```
ApiError (base, code + status? + payload? + cause?)
├── HttpError              — raw HTTP-error от defaultFetcher (несёт Response + bodyText)
├── UnauthorizedError      — 401 (statusMapper маппит)
├── ForbiddenError         — 403
├── NotFoundError          — 404
├── ConflictError          — 409
├── ServerError            — 5xx
├── NetworkError           — non-status error (connection refused и т.п.)
├── TimeoutError           — request timed out
└── ValidationError        — zod-parse failure (phase: 'request' | 'response')
```

Feature ловит типизированно:

```ts
try { ctx.user = await api.user.get({ id }); }
catch (e) {
  if (e instanceof UnauthorizedError) state.set('unauthorized');
  if (e instanceof ValidationError && e.phase === 'request') ...
}
```

## Гочи (15 граблей)

1. **`validateInput` запускается ДО `preRequest`.** `ctx.input` внутри preRequest — уже zod-parsed (типа `ZOut<request>`). Если хочешь raw input — переопредели порядок (но это сигнал что нужна другая архитектура).

2. **`setInput()` НЕ перевалидируется.** Caller сам поддерживает type. Если нужна повторная валидация после трансформации — кастомный mw после `preRequestHook`.

3. **`resolve(data)` пропускает `validateResponse` + `mapDomain`.** Caller передаёт **финальный domain shape** (не raw DTO). Mock-данные НЕ проверяются — design-decision, чтобы быстро мокать без жёсткой типизации mock-fixtures.

4. **`preRequest` — per-endpoint сахар над Middleware.** Для cross-endpoint логики (auth, retry, logging) → `ApiConfig.middleware` или per-endpoint `EndpointConfig.middleware`. Не клонируй один preRequest по 10 endpoints — индикатор middleware.

5. **Phantom-type symbols `__input` / `__output` в `Endpoint<I, D>`** (см. `src/endpoint.ts:36-37`). Несут `I` и `D` через границы вызовов чтобы `createApi` мог их вывести. **НЕ удалять, НЕ менять** — `InferInput<E>` / `InferOutput<E>` сломаются.

6. **`setApiClient(api)` дёргается из generated `app-config.gen.ts`.** Manually-built test setup'ы (`__tests__/createApi.test.ts`) делают это руками в `beforeEach`. Если `getApiClient()` возвращает `undefined` в runtime — забыли вызвать setter (или `createApi` не отработал).

7. **`defineAppConfig` живёт в `/app-config` subpath, НЕ в root.** Раньше был в `@capsuletech/web-core/interfaces.ts`, перенесён сюда чтобы `web-core` не зависел от `web-query` на уровне типов. Импорт `from '@capsuletech/web-query/app-config'`.

8. **`CapsuleApi` — пустой interface по умолчанию** (`src/createApi.ts:18`). Расширяется через interface-merging из `apps/<app>/.capsule/@types/api.d.ts` (генерится `EndpointsRegistryPlugin`'ом). Без плагина `api.user.get(...)` TS не пропустит — это "API не настроен" кейс.

9. **`staleTime` имеет смысл только на GET.** mutate (POST/PUT/PATCH/DELETE) — uncached. `httpTransport` дёргает `client.fetch` для GET (с cache-key) и `client.mutate` для остальных.

10. **`:param`-плейсхолдеры в `path`.** `buildRequest` подставляет из `ctx.input` по имени ключа; оставшиеся поля → `params` (GET/HEAD/DELETE) или `body` (POST/PUT/PATCH). Если `:param` отсутствует в input → throws `Missing path param ":<key>"`.

11. **`buildRequest` НЕ сериализует `null`/`undefined` в params.** Skip-if-not-set семантика. ReadonlyArray в значении → multi-value `?k=a&k=b`. См. `RequestConfig.params` тип в `types.ts:33-41`.

12. **`httpTransport` ловит non-`status` ошибки в `NetworkError`.** Ошибки с `.status` (от `defaultFetcher` через `HttpError`) пробрасываются as-is → `statusMapper` дальше конвертит в типизированные. Сырое исключение БЕЗ `.status` (connection refused, DNS, decoder) → wrap в `NetworkError`.

13. **`compose` throws on двойной `next()` в одном mw.** Middleware-авторы НЕ должны вызывать `next()` дважды — нарушение koa-протокола. Источник: `src/pipeline.ts:42-53`. Если поймал — баг middleware.

14. **`devOnly()` в test-env ВСЕГДА работает как passthrough.** Vitest substitutes `import.meta.env.DEV` → `true` at transform time, runtime-мутация не помогает. Поведение в prod-build верифицируется только на уровне Vite-сборки apps (визуально проверяй bundle).

15. **`HttpError.bodyText` читается единожды в `defaultFetcher`.** `Response.body` — stream, читается один раз. `response.text()` / `.json()` после throw'а вернут пустую строку. Если consumer (error-interceptor, Sentry) хочет body — берёт из `error.bodyText`, НЕ из `error.response`.

## Что менять когда {#changes-guide}

| Хочу… | Куда лезть |
|---|---|
| Новое поле в `EndpointConfig` | `src/endpoint.ts > EndpointConfig` + опционально новый mw в `middleware/core.ts` |
| Новый built-in mw (например `cache-control`) | `src/middleware/core.ts` + export из `middleware/index.ts` + (если public для `mw.*`) добавить в `MwToolbox` в `createApi.ts` |
| Новый user-facing mw | `src/middleware/user.ts` + `middleware/index.ts` + `MwToolbox` |
| Новый ApiError-наследник | `src/errors.ts` + опционально маппинг в `mw.statusMapper` |
| Поменять pipeline-order | `src/createApi.ts > wrapEndpoint`. Любое изменение order'а — breaking, нужен ADR |
| Расширить `PreRequestCtx` | `src/endpoint.ts > PreRequestCtx` + реализация в `middleware/core.ts > preRequestHook`. Breaking — нужен ADR |
| Дать preRequest validate-флаг (опциональная zod-проверка `resolve(data)`) | `src/endpoint.ts > PreRequest`-shape: либо overload, либо `{ handler, validate?: boolean }`. ADR-кандидат |
| Включить cancellation в pipeline | Через `AbortController` в `RequestConfig.signal` (поле уже есть). httpTransport читает; для preRequest можно добавить `ctx.signal` |
| Поменять fetcher на per-endpoint | `RequestConfig.fetcher` уже есть; в endpoint просто `request: ..., middleware: [(ctx, next) => { ctx.request.fetcher = customFetcher; return next(); }]` |

## Cross-package etiquette

- **`web-core` — главный consumer** через `createLogicWrapper` (`services.api = getApiClient()`). Breaking change в `getApiClient()`-return или `CapsuleApi`-shape → owner-web-core.
- **`shared-zod` — peer dep** для `CapsuleZ`-type. defineEndpoint factory принимает `{ zod: CapsuleZ, utils: Utils }` (инструменты объектом). owner-shared-zod при изменении CapsuleZ.
- **`shared-utils` — dep** для `Utils`-namespace. defineEndpoint factory прокидывает `utils: Utils` (es-toolkit + gap-fillers). owner-shared при изменении Utils.
- **`builders/vite > EndpointsRegistryPlugin`** генерит `apps/<app>/.capsule/@types/api.d.ts`. Любое изменение shape'а endpoints/registry — согласуй с owner-builders.
- **`builders/vite > AppConfigPlugin`** парсит `capsule.app.ts`, генерит tag/alias-registry runtime-binding. owner-builders при изменении `IAppConfig`.
- **Все Features (apps)** дёргают `services.api.<namespace>.<endpoint>({...})`. Breaking change в return-type / signature `wrapEndpoint` — массовый impact.

## Cross-links {#cross-links}

- User-doc: [[query]] (TBD)
- ADRs: [[011-define-app-config]] (если есть), [[013-app-config-subpath]] (если есть)
- Connected: [[core]] (consumer через services.api), [[builders/vite-plugins|EndpointsRegistryPlugin]], [[shared-zod|CapsuleZ]]
- POLICY: cross-package boundaries, test-first, release-coord
