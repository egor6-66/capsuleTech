---
tags: [hca, adr, accepted, builders, hooks, auto-import, canon]
status: accepted
date: 2026-06-14
last_updated: 2026-06-14
---

> [!success] Status
> **Accepted** — 2026-06-14. Канонизирует `HOOK_IMPORTS` SSOT (`packages/builders/vite/src/plugins/constants.ts`) после добавления `useRouter` (#353) и `useDesktop` (в очереди на merge). Sister к [[050-ui-namespace-kit-mounted-raw-passthrough|050]].

# ADR 051 — HOOK_IMPORTS централизованный SSOT

## Контекст {#context}

### Pain 1 — Runtime-сервисы должны быть доступны в app без import-keyword {#pain1}

Apps по канону собираются через globals (`Ui.*`, `Views.*`, `Controllers.*`, `Features.*`, `Shapes.*`, `Entities.*`, wrapper-функции `Page`/`Widget`/`View`/`Controller`/`Feature`/`Shape`/`Entity`). Compliance (Phase L) запрещает runtime-import `@capsuletech/*` в app-слоях.

Но **runtime-сервисы** (router, desktop, ctx) не вписываются в Ui-namespace pattern (см. [[050-ui-namespace-kit-mounted-raw-passthrough|ADR 050]]) — это не data-namespace'ы, а функции доступа к runtime'у. Нужен механизм глобализации hooks без import'а в app-коде.

### Pain 2 — `unplugin-auto-import` требует декларативного списка {#pain2}

`@capsuletech/vite-builder` использует `unplugin-auto-import` для инжекта global identifier'ов в TSX-файлы. Плагин принимает декларативный manifest `imports`: `{ [package]: [names] }`. Сейчас единственная точка правды — объект `HOOK_IMPORTS` в `packages/builders/vite/src/plugins/constants.ts`:

```ts
export const HOOK_IMPORTS = {
  '@capsuletech/web-core': ['useCtx'],
  '@capsuletech/web-router': ['useRouter'],
  '@capsuletech/desktop/runtime': ['useDesktop'],
} as const;
```

`capsuleConfig` собирает этот объект в `AutoImport({ imports: [...] })` и `ExportGeneratorPlugin`/`CapsuleRegistryPlugin` используют его же для type-generation.

### Pain 3 — Cross-package coupling в builders SSOT {#pain3}

`HOOK_IMPORTS` в builders «знает» имена subpath'ов сторонних пакетов (`@capsuletech/web-router`, `@capsuletech/desktop/runtime`). Это **cross-package coupling**: добавление hook'а в `@capsuletech/web-foo` требует PR'а в builders. Owner-builders, по policy, не должен знать про доменные пакеты.

Owner-studio (review 2026-06-14) поднял риск: «после 5-го пакета это станет узким местом — magnet for merge conflicts между owner'ами». Нужно либо канонизировать coupling как намеренный trade-off, либо запланировать migration на distributed manifest.

### Pain 4 — Когда мигрировать на distributed manifest {#pain4}

Альтернатива — каждый owning-пакет объявляет hooks в своём `package.json` поле (например, `"capsule": { "hooks": { "@capsuletech/web-router": ["useRouter"] } }`), а builders читает glob'ом workspace. Это снимает coupling, но добавляет dynamic-resolution slowdown + complexity. Преждевременно при 3 entry, осмысленно при 8+.

## Решение {#decision}

### D1 — `HOOK_IMPORTS` как канон сейчас {#D1}

`packages/builders/vite/src/plugins/constants.ts:HOOK_IMPORTS` — **единственная точка** регистрации auto-imported hook'ов. Каждая запись:
```
[package-or-subpath]: [hookName, hookName, ...]
```

Один объект literal, type-safe (TS verifies статически). Используется:
- `AutoImport` plugin'ом для inject'а identifier'ов в TSX.
- `ExportGeneratorPlugin` для generation типов в `.capsule/@types/`.
- `CapsuleRegistryPlugin` для типизации `capsule-imports.d.ts`.

### D2 — Кто и когда расширяет {#D2}

Добавление hook'а — **two-step canon**:

1. **Owning-пакет** (`@capsuletech/desktop`, `@capsuletech/web-router`, ...) экспортит hook из своего public API (или subpath).
2. **Builders PR** (через `owner-builders`) добавляет entry в `HOOK_IMPORTS`. Owner-builders не «знает» доменную семантику hook'а — это просто string entry.

Pull request на step 2 открывает **owner owning-пакета** (или главный), но **delegate'ит коммит** в `owner-builders`. Canon: «один PR на hook, отдельный от пакетного PR'а на сам export».

Альтернативно (атомарно): owning-package PR содержит и export, и edit в `constants.ts` под единым coordinated label. Допустимо как cross-zone change (см. [[050-ui-namespace-kit-mounted-raw-passthrough#D4|ADR 050 D4]]).

### D3 — Subpath-resolution canon {#D3}

Запись в `HOOK_IMPORTS` — это **точное package-spec** для resolver'а: `'@capsuletech/web-router'` или `'@capsuletech/desktop/runtime'`. Subpath учитывается. Это даёт пакетам возможность изолировать hook'и от main API:
- `@capsuletech/desktop` (main) — `runDev`/`runBuild` (build pipeline, не для app).
- `@capsuletech/desktop/runtime` — `useDesktop` (для app).

Без subpath canon hook'и засоряли бы main entry. Subpath обязателен, если main entry содержит build-time code (как в desktop).

### D4 — Migration trigger {#D4}

`HOOK_IMPORTS` остаётся централизованным до **первого из**:
- **8 entries** в объекте (sum length всех arrays).
- **3 разных owner-pkg** хотят добавить hook в одном PR-окне (≤2 недели) — соревнование за SSOT файл.
- **Type-generation overhead** становится заметным (slow incremental builds в dev — но это маловероятно при <50 entries).

При достижении trigger'а — отдельный ADR на migration: distributed `package.json:capsule.hooks` manifest + workspace-glob в builders. До тех пор — централизованный объект.

### D5 — Что НЕ кладём в HOOK_IMPORTS {#D5}

- **Wrapper-функции** (`Page` / `Widget` / `View` / ...) — отдельный канон `RENDER_WRAPPER_NAMES` + `CONFIG_WRAPPER_NAMES` в том же файле constants.ts. Они также auto-imported, но требуют HMR-обвязки (см. `HMRWrappingPlugin`).
- **Namespace globals** (`Ui` / `Views` / `Widgets` / `Controllers` / `Features` / `Shapes` / `Entities`) — приходят через `.capsule/registry/wrappers.ts` (сгенерён `ExportGeneratorPlugin`'ом), не через `HOOK_IMPORTS`.
- **`useEmit`** — это API для package-controllers (см. [[032-package-controllers-and-useemit|ADR 032]]), используется внутри пакетов, **не в app**. В `HOOK_IMPORTS` ему не место.
- **Component-namespace'ы** (`Ui.Icons` / `Ui.Flow` / ...) — это [[050-ui-namespace-kit-mounted-raw-passthrough|ADR 050]], не hooks.

## Последствия {#consequences}

### Положительные
- Один файл для редактирования при добавлении hook'а. Дешёвый PR, statically typed.
- Type-safety гарантируется TypeScript'ом — опечатка в hook name = build error.
- `ExportGeneratorPlugin`/`CapsuleRegistryPlugin` reuse'ят тот же manifest — single source of truth.
- Apps пишут чистый код без import: `const router = useRouter()`, `const desktop = useDesktop()`.

### Отрицательные / открытые
- Cross-package coupling в builders SSOT — намеренный trade-off. Пакетный PR (на сам hook export) не самодостаточен — нужен parallel PR в builders. Coordination overhead.
- `constants.ts` становится merge-magnet'ом при росте pkg-экосистемы. Migration trigger (D4) ограничивает размер боли.
- Owner-builders «знает» о доменных пакетах. Полностью устраняется migration'ом на distributed manifest — но не сейчас.

## Альтернативы (рассмотрены, отклонены) {#alternatives}

- **A. Distributed manifest сейчас.** Каждый пакет в `package.json:capsule.hooks`. Отклонено — preliminary optimization, complexity без выгод при 3 entry. Перенесено в migration trigger (D4).
- **B. Soft-coupled side-effect registration.** Owning-пакет регистрирует hook через side-effect import в builders runtime. Отклонено — теряем type-safety, опечатки только на dev-server start.
- **C. Per-package vite-plugin contribution.** Owning-пакет содержит свой mini vite-plugin, builders compose'ит их. Отклонено — overhead для одной строки decl'а.

## Связь с другими ADR {#cross-links}

- [[050-ui-namespace-kit-mounted-raw-passthrough|ADR 050]] — sister canon: data-namespace'ы через `Ui.X` (kit-mounted + raw passthrough), runtime-сервисы через `useX()` hooks (этот ADR).
- [[032-package-controllers-and-useemit|ADR 032]] — `useEmit` остаётся API package-controllers, не app-global (см. D5).
- [[033-package-capsule-registration|ADR 033]] — capsule registration для component-namespace'ов (не для hooks).
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] — zone canon; HOOK_IMPORTS живёт в builders zone, owning-пакеты — в своих зонах.
