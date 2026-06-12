---
name: "@capsuletech/web-intl"
owner-agent: главный (стюардит главный assistant)
group: web_base
zone: runtime
status: alpha
priority: P2
last-updated: 2026-06-11
---

# @capsuletech/web-intl

i18n-слой capsule: реактивный locale/tenant-стейт + реестр copy-словарей (base и
per-tenant) + резолвер строк по ключу с подстановкой.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — i18n-слой, провайдер маунтится в `BaseProviders` (web-core).
- **Status:** `alpha` (0.1.0) — реактивный locale state работает; tenant-словари — TBD.
- **Priority:** **P2** — single-locale apps без него живут; нужен для multilingual.
- **Maturity bar (до beta):**
  - per-tenant copy registry stable API.
  - ICU MessageFormat (или альтернатива) — параметризация строк, plurals.
  - Lazy locale loading.
  - Capsule manifest для tenant registration (ADR 033).
- **Active blockers:** нет выделенного owner'а; стюардит главный.
- **Roadmap:**
  1. Tenant-словари API.
  2. ICU MessageFormat / Polyfill оценка.
  3. Lazy-loading.
- **Last activity:** 2026-06-11 (canon refresh).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- _(TBD)_ ICU MessageFormat lib (intl-messageformat / format-message) — оценить в Phase D.

## Зона ответственности

### Owns
- `packages/web/intl/src/` (полностью)
- `packages/web/intl/package.json` exports / deps
- `packages/web/intl/vite.config.*`

### Не трогает
- Содержимое других `@capsuletech/*` пакетов (делегировать их owner'ам).
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant).
- `apps/*/` (user / framework-developer scope).
- Shared infra (`scripts/release-local.mjs` и т.п.) — главный assistant.

## Публичный API

Единственный entrypoint `.`:
- **Locale/tenant-стейт** (`locale.ts`): `getLocale`/`setLocale`/`useLocale`,
  `useLocales`, `getDefaultLocale`/`setDefaultLocale`/`useDefaultLocale`,
  `getTenant`/`setTenant`/`useTenant`. Реактивные геттеры (Solid).
- **Provider** (`provider.tsx`): `IntlProvider` + `IIntlProviderProps` — оборачивает
  app, инициализирует locale/tenant.
- **Реестр copy** (`registry.ts`): `registerCopy`/`registerTenantCopy`,
  `getBaseDict`/`getTenantDict`/`getRegisteredLocales`. base-словарь + per-tenant
  дельты (tenant-ось, ср. theme/style).
- **Резолвер** (`resolve.ts`): `resolveCopy`, `useCopy` — строка по ключу с
  fallback base→tenant.
- **Хелпер** (`flatten.ts`): `flatten` + `NestedDictionary` — разворачивает
  вложенный словарь в плоские dot-ключи.
- **Типы** (`types.ts`): `CopyResolver`, `Dictionary`, `ICopyBundle`, `Locale`, `Tenant`.

Изменение публичного API = breaking change → coordinate с главным.

## Quirks / gotchas

- **tenant-ось** — copy резолвится base→tenant с per-tenant дельтами (как
  style/theme tenant-параметризация playground). Tenant-словарь переопределяет base.
- **Реактивность** — locale/tenant держатся в Solid-сигналах; `useCopy` пересчитывается
  при смене locale без перемонтирования (см. `__tests__/reactive.test.ts`).
- **flatten** ожидает однородно-вложенный словарь; коллизия плоского и вложенного
  ключа (`a.b` как строка И как объект) — undefined behaviour, не смешивать.

## План рефакторинга / оптимизаций

- [ ] **Назначить выделенного owner-web-intl** — сейчас стюардит главный. (priority: low)
- [ ] **ICU/plural-поддержка** — текущий резолвер только подстановка, без plural-правил. (priority: low)

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `src/__tests__/flatten.test.ts` | разворачивание вложенных словарей в dot-ключи |
| Unit | `src/__tests__/resolve.test.ts` | резолв copy по ключу, fallback base→tenant |
| Unit | `src/__tests__/reactive.test.ts` | реактивность `useCopy` при смене locale |

**Перед изменением:** `pnpm --filter @capsuletech/web-intl test` должен быть green.
**При breaking change:** обновить tests + добавить новые для нового contract'а.
**Перед release:** `pnpm test:e2e:cli` обязателен.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| HCA wrappers, providers, bootstrap | owner-web-core |
| tenant-ось build (forge / playground) | главный (playground) |
| Theme/style tenant-параметризация | owner-web-style |

## Release group

- `web_base` — fixed group (web-core/dnd/profiler/query/remote/renderer/router/state/style/ui + intl + shared-zod).

После изменений — координировать release через главного.
