---
name: "@capsuletech/boost-layout"
owner-agent: owner-boost-layout
group: web_base
zone: boost
status: scaffold
priority: P1
last-updated: 2026-06-12
---

# @capsuletech/boost-layout

Heavy Layout booster — augments kit `Ui.Layout` namespace with resize/DnD/persistent layouts (Matrix first). Currently SCAFFOLD.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `boost` (per ADR 047 D1).
- **Status:** `alpha` — Matrix-код перевезён из web-shell (B2 closed 2026-06-12). Apps работают через `Layouts.Matrix` (ADR 033 namespace).
- **Priority:** P1 — каждое apps/playground+ewc+nexus подключает для resize/DnD/persist layouts.
- **Maturity bar (alpha → beta):**
  - `Ui.Layout.Matrix` augmentation runtime реализован в `web-core` (D5 implementation pending).
  - TS module augmentation `Ui.Layout` shape добавлен.
  - Documented presets API (`app-shell`, `studio`, `dashboard`).
  - Test coverage расширен (новые heavy variants).
- **Active blockers:** D5 augmentation runtime hook (Object.assign Ui.Layout) ещё не реализован в `web-core` — UI consumers пишут `<Layouts.Matrix/>` (programmatic axis), `<Ui.Layout.Matrix/>` появится после D5.
- **Roadmap:**
  - D5 augmentation runtime hook (web-core coordination).
  - Future heavy variants: Bento, Dock, Masonry (TBD).
- **Last activity:** 2026-06-12 — B2 Matrix relocation from web-shell.

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный движок.
- **`@capsuletech/web-core`** (workspace, dep) — HCA wrappers + ControllerProxy для MatrixController.
- **`@capsuletech/web-ui`** (workspace, dep) — primitives (`Flex`, `WidgetFrameGrip`) для cell/row rendering.
- **`@capsuletech/web-style`** (workspace, dep) — `createStyle`, `cva`, `useDndMode`, `useResizeMode`.
- **`@capsuletech/web-dnd`** (workspace, dep) — pointer-based DnD для region swap/insert/sort.

## Зона ответственности

### Owns
- `packages/web/boost/layout/src/` (полностью)
- `packages/web/boost/layout/vite.config.mts`
- `packages/web/boost/layout/package.json` exports / deps
- `packages/web/boost/layout/src/capsule.ts` (ADR 033 manifest)

### Не трогает
- `packages/web/domain/shell/*` (owner-web-shell). Если Matrix-API нужен shell — через `web-contract` (ADR 047 D2), не прямой импорт.
- `packages/web/kit/ui/*` (owner-web-ui). Augmentation `Ui.Layout` происходит через runtime (Object.assign) или ADR 033 manifest, НЕ через прямую правку kit-source.
- `apps/*` — page-агенты / main steward.
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant).

## Публичный API

- `.` (main) — `Matrix` component + `IMatrixProps` / `IMatrixEvents` / `LayoutChangeEvent` types + preset helpers (`appShellResolver`, `resolvePreset`) + `normalizeSlotValue`.
- `./controllers` — `MatrixController` (HCA Controller-обёртка ADR 032) + `IMatrixEvents` re-export.
- `./capsule` — ADR 033 manifest (`defineCapsuleModule({ name: 'Layouts', components: { Matrix: MatrixController } })`).

## Quirks / gotchas

- **Augmentation pattern (ADR 046 D5)** — `Ui.Layout.Matrix` доступ работает через runtime augmentation hook (TBD в D5 implementation). До его готовности консьюмеры используют `Layouts.Matrix` (ADR 033 global namespace).
- **Naming `Layouts` (plural) vs `Ui.Layout` (singular)** — `Layouts` это programmatic global registry (ADR 033 mirror of `Maps`, `Tables`, ...); `Ui.Layout` это UI-namespace в kit (`{ Flex, Grid, ... }`). Mirror of how boost-map имеет `Maps.View` + kit имеет `Ui.Map.View`.

## План рефакторинга / оптимизаций

- [x] **B2: Matrix relocation** — 2026-06-12. Matrix code moved from web-shell. Tests переехали вместе с кодом.
- [x] **B3: apps consumer-update** — 2026-06-12. Apps switch `Shell.Matrix` → `Layouts.Matrix` (this PR).
- [x] **Presets** — `appShellResolver`, `resolvePreset` мигрированы из shell (this PR).
- [ ] **Augmentation runtime hook** — coordinate с owner-web-core: `Object.assign(Ui.Layout, contributions)` на app boot. (priority: P0 — blocks Ui.Layout.Matrix UI consumer API)
- [ ] **TS module augmentation** — `declare module '@capsuletech/web-ui/layout' { interface ILayoutNamespace { Matrix: typeof Matrix } }`. (priority: P1, needs D5 runtime first)
- [ ] **Future heavy variants** — Bento, Dock, Masonry (TBD после Matrix stable). (priority: P3)
- [ ] **AI-anchor** `docs/_meta/boost-layout.md` — углублённая архитектура. (priority: P2)
