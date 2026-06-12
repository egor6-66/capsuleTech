---
title: web-zone-boost
description: Canon для zone `boost` — heavy domain-mirror kit-примитивов. Source of truth о scope, mirror-pattern, импорт-правилах, vendor-stack.
status: canon
last_updated: 2026-06-11
---

# Zone: boost

> Физическая директория: `packages/web/boost/` (после Phase D миграции; на момент 2026-06-11 — плоский `packages/web/{table,map,flow,charts}/`, после rename'а Phase W6 → `packages/web/{boost-table,boost-map,boost-flow,boost-charts,boost-matrix}/`).
>
> Канон-источники: [[046-boost-namespace-matrix-evict-vt-owner|ADR 046]] (boost-* namespace + Matrix evict), [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1, [[044-web-menu-package|ADR 044]] (heavy=pkg / light=kit principle).

## Purpose {#purpose}

**Heavy domain-mirror kit-примитива.** Тяжёлый движок (virtual-scroll engine, map-engine, graph-engine, WebGL/WebGPU), зеркалирующий light-примитив из kit, но дающий full-power возможности.

Boost-пакет обязан удовлетворять четырём инвариантам:

1. **Mirror kit-primitive.** Каждый boost имеет соответствующий light-mirror в `web-ui`: `boost-table` ↔ `Ui.Grid` (light grid layout); `boost-map` ↔ `Ui.Map` (placeholder); `boost-flow` ↔ `Ui.Flow` (placeholder); `boost-charts` ↔ `Ui.Chart` (placeholder); `boost-matrix` ↔ `Ui.Grid` (light Matrix через Ui.Grid).
2. **Heavy by definition.** Тянут engine-уровневые dependencies (десятки/сотни kB minified). Это и есть смысл boost'а — pay-for-what-you-use.
3. **Registered through ADR 033.** Boost регистрируется как global (`Tables.*`, `Maps.*`, `Flows.*`, `Charts.*`, `Matrices.*`) через `defineCapsuleModule`, не через прямой импорт в каждом widget'е.
4. **No cross-boost coupling.** `boost-table` не знает про `boost-map`. Composition — на уровне app/widget'а.

## Packages {#packages}

> **Naming canon (post-ADR 046):** все boost-пакеты используют префикс `@capsuletech/boost-*` (НЕ `@capsuletech/web-*`). Это явно сигналит «бустер light-примитива». Rename из `web-*` → `boost-*` выполняется в Phase W6 plan-doc.

| Package | npm | Mirror in kit | Status | One-line |
|---|---|---|---|---|
| `boost-table` | `@capsuletech/boost-table` | `Ui.Grid` | beta | DataTable composite (TanStack Table + virtual-scroll) + raw Table primitives + lib (createInfiniteScroll/createPagination). |
| `boost-map` | `@capsuletech/boost-map` | `Ui.Map` (placeholder) | alpha | MapLibre GL + Solid wrapper: Source/Layer/Terrain/Sky + TerrainPreset/BuildingsPreset. |
| `boost-flow` | `@capsuletech/boost-flow` | `Ui.Flow` (placeholder) | scaffold | Node/edge graph editor (XYFlow или собственный canvas). |
| `boost-charts` | `@capsuletech/boost-charts` | `Ui.Chart` (placeholder) | scaffold | Charts library (TBD vendor: Visx/Recharts/D3-based). |
| `boost-matrix` | `@capsuletech/boost-matrix` | `Ui.Grid` | scaffold | Heavy Matrix grid: corvu/resizable + capsule web-dnd + persistence + presets (app-shell / studio / dashboard). Эвакуация из web-shell per ADR 046 D2. |

## Import rules {#import-rules}

```
boost → kit (можно — для mirror'а Ui.X)
boost → runtime (можно — нужны web-state/web-query/web-style)
boost ↛ domain (FORBIDDEN — boost не знает про domain)
boost ↛ boost (FORBIDDEN — no cross-boost)
boost ↛ studio
```

**Boost ↛ domain — почему:** boost — это «фичевый примитив». Domain — это «мини-апп». Если boost начнёт зависеть на domain (например `boost-map` тянет `web-auth`), он перестанет быть переиспользуемым в других domain'ах.

**Boost ↛ boost — почему:** boost — это **per-component прокачка**, не лестница. Если widget хочет table + map одновременно — это композиция в widget'е, не coupling boost'ов.

Compliance enforces: boost → domain/другой boost = warning.

## Canonical shape {#canonical-shape}

Структура типичного boost-пакета:

```
packages/web/boost/<name>/
  src/
    index.ts                ← главный entry (high-level composite, например DataTable)
    primitives/             ← raw building blocks (Table.Root/Head/Body/...)
    lib/                    ← headless helpers (createInfiniteScroll, createPagination)
    capsule.ts              ← ADR 033 manifest (defineCapsuleModule с регистрацией globals)
    types.ts                ← HKT marker для row-generic typing (Shape<Tmpl>)
  package.json              ← multi-entry exports + sideEffects: false
  OWNERSHIP.md
  README.md                 ← MUST minimum usage 5-10 строк
```

Признаки канона:

- **Light-mirror в `web-ui`** — например `Ui.Grid` существует независимо от того, установлен ли `boost-table`. Boost — opt-in upgrade.
- **High-level composite + raw primitives + lib** — три tier'а внутри пакета. App может использовать `DataTable` (composite), или собрать своё через `Table.Root/.../Body` (primitives), или взять headless `createInfiniteScroll` (lib).
- **`capsule.ts` manifest регистрирует global** — `Tables.DataTable`, `Maps.MapView`, etc. App пишет `Tables.DataTable` без импорта.
- **HKT-marker для типизации** — `IDataTableProps<TRow>` через HKT для row-generic Shape (ADR 036 shape v2).
- **`sideEffects: false`** — критично для tree-shake'а.

Пример consume в app (ADR 033 канон):

```tsx
// apps/<app>/src/widgets/users-table.tsx
export default Widget((Ui, props) => {
  // Tables.* — global, регистрируется boost-table через ADR 033
  return <Tables.DataTable shape={Shapes.UsersTable} data={props.users} />;
});
```

## Vendor stack {#vendor-stack}

Per-boost (детали в OWNERSHIP.md каждого):

- **`boost-table`** — `@tanstack/solid-table` + `@tanstack/solid-virtual`.
- **`boost-map`** — `maplibre-gl` (+ опц. THREE.js для terrain/buildings).
- **`boost-flow`** — TBD (`@xyflow/solid`? собственный canvas?).
- **`boost-charts`** — TBD.
- **`boost-matrix`** — `corvu/resizable` + `@capsuletech/web-dnd` (peerDep) + persistence (TBD storage).

Документация upstream — per-package.

## Non-goals {#non-goals}

Boost **не делает**:

- ❌ Light placeholder в boost-пакете. Light Ui.Map / Ui.Flow / Ui.Chart живут в `web-ui` (kit). Boost — только heavy.
- ❌ Зависимость на другой boost.
- ❌ Зависимость на domain.
- ❌ Композицию с domain-логикой. `boost-table` не знает про auth-роли — это widget-уровень.
- ❌ Editor-функциональность. Inspector / palette / canvas — studio (`studio`), не boost.
- ❌ Глобальный provider в каждом app'е. Boost регистрируется через `defineCapsuleModule` — apps opt-in.

## New package — checklist {#new-package-checklist}

Добавление boost-пакета — **архитектурное решение**. Перед PR'ом:

1. Открыть дискуссию с главным assistant'ом — у boost'а есть light-mirror в kit'е?
   - Если нет mirror'а → сначала добавить light placeholder в `web-ui`.
   - Если mirror уже есть как другой boost'а — это **противопоказание**: возможно нужен другой engine у существующего boost'а, не отдельный пакет.
2. Если новый boost одобрен:
   - **Naming**: `@capsuletech/boost-<name>` (НЕ `web-*`).
   - Path config: `tsconfig.base.json` (`@capsuletech/boost-<name>` → `packages/web/boost/<name>/src/index.ts`) + `optimizeDeps.exclude` + Vite-builder rebuild.
   - `OWNERSHIP.md`:
     - «Состояние» секция.
     - «Vendor stack» секция — обязательно engine vendor + кратко почему именно он.
   - `README.md` (minimum usage с импортом).
   - AI-anchor `docs/_meta/<name>.md`.
   - `capsule.ts` manifest — `defineCapsuleModule` с регистрацией global namespace (`Tables.X`, `Maps.X`, etc).
   - Light-mirror в `web-ui` — координация с owner-web-ui.
3. ADR обязателен (новый boost = новый capability в global registry).
4. Owner-агент `.claude/agents/owner-boost-<name>.md` ([[owner-agent-canon]]).
5. Release-group `web_base` в `scripts/release-local.mjs`.

## Related {#related}

- [[web-table]] (→ переименование `boost-table`), [[web-map]] (→ `boost-map`), [[web-flow]] (→ `boost-flow`), [[web-charts]] (→ `boost-charts`) — per-package AI-anchors.
- [[web-zone-kit]] — у каждого boost'а есть light-mirror в kit'е.
- [[web-zone-runtime]] — boost ИМЕЕТ право импортить runtime.
- [[web-zone-domain]] — domain ИМЕЕТ право импортить boost; boost НЕ зависит на domain.
- [[046-boost-namespace-matrix-evict-vt-owner|ADR 046]] D1 — boost-* namespace, D2 — Matrix evict, D3 — light always exists in web-ui.
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1.
- [[044-web-menu-package|ADR 044]] — heavy=pkg / light=kit principle.
- [[033-package-registration|ADR 033]] — defineCapsuleModule manifest.
