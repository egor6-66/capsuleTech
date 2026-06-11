---
name: @capsuletech/web-intl
owner-agent: главный (нет выделенного owner'а — стюардит главный assistant)
group: web_base
status: pre-1.0
last-updated: 2026-06-11
---

# @capsuletech/web-intl

i18n-слой capsule: реактивный locale/tenant-стейт + реестр copy-словарей (base и
per-tenant) + резолвер строк по ключу с подстановкой.

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
