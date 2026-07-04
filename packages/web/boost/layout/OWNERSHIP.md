---
name: "@capsuletech/boost-layout"
owner-agent: owner-boost-layout
group: web_base
zone: boost
status: scaffold
priority: P1
last-updated: 2026-06-16
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
- **Last activity:** 2026-07-04 — swap-DnD root-fix пакет (см. Quirks): реактивный swapped-content, per-slot `draggable` override, group-aware бэйджи, общий дефолтный swapGroup `'shell'` в app-shell. Full drop-flow теперь unit-тестится.

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
- **Toggle-stability contract (2026-06-16, closed)** — `MatrixContent`'s branch selection is a `<Switch>` JSX-tree, NOT a synchronous `renderContent()` function call inside `<>{...}</>`. Top-level toggle signals (`dndEnabled`, `dndKind`, `resizeEnabled`) MUST flow as accessors (or as always-on bindings whose engine self-gates) — never gate the *shape* of `getCellDndState`, `swapBind`, or `swapGetChildren` on these signals, because that flips the renderCell branch and re-mounts the cell subtree (destroys accordion / scroll / focus state). See `src/matrix/__tests__/toggle-stability.test.tsx` for the regression guard.
- **`swap.getCellChildren` is the source of truth for cell content** whenever `dndKind !== 'insert'` — including DnD off. The swap-engine's children-map lives for the matrix lifetime; gating its visibility on `dndEnabled` causes a user-applied swap to visually revert when DnD is toggled off and snap back on re-enable. Insert mode reshapes the row list directly (`insert.rows()`), so it owns the children pipeline there.
- **`ICellDndState.showBadge` is an `Accessor<boolean>`** — needed so badge mount/unmount on DnD toggle is a local `<Show>` flip inside `renderCell`, not a cell re-render. С 2026-07-04 акцессор per-cell и group-aware (`swap.getShowBadge`): бэйдж виден только когда cell enabled И в её swapGroup есть другая enabled cell. Старый глобальный порог «2+ draggable всего» давал drag-без-drop (валидной цели не существовало).
- **Swapped-content — accessor, не снапшот (2026-07-04, closed).** `renderCell`/`renderPackingRow`/`renderGridRow` раньше снапшотили `getSwappedChildren(cell.id)` в `const` при построении ячейки → чтение `childrenMap`-сигнала было нереактивным: после drop'а `onLayoutChange` стрелял, а DOM не менялся («drop не работает»). Теперь `content` — функция, вызываемая в JSX (`{content()}`), Solid оборачивает в реактивный insert. Регрессия-гард: сьют «Matrix — full swap drop flow» в `swap-dnd.test.tsx` (полный pointerdown→move→up цикл в jsdom с моком `document.elementFromPoint`; web-dnd не использует pointer capture, поэтому цикл выполним).
- **Per-cell DnD precedence (2026-07-04):** `cell.draggable` — tri-state: `true` всегда включён (оверрайдит `mode` и матричный `dnd`-prop и глобальный сигнал), `false` всегда выключен, `undefined` следует matrix-резолюции (`dnd` prop > `mode` > global). Резолвер `isCellSwapEnabled` в content.tsx, движок принимает `isCellEnabled(cell)` вместо глобального `enabled`. Insert-движок пока на глобальном enable (per-slot для insert — TBD).
- **app-shell default swapGroup = `'shell'` (2026-07-04):** все слоты в одной группе — при включённом DnD любой слот свапается с любым. Прежние партиции (`'band'`/`'aside'`/main без группы) означали, что типовые страницы (header+main; main+rightBar) не имели ни одной валидной пары. Ограничение — явный `swapGroup` / `draggable: false`.
- **Resize: per-slot override НЕ реализован — заблокирован контрактом web-ui (см. Roadmap/эскалация).** `resizable: true` на слоте при `mode="view"` ручку не включает; «бордер» который виден при `resizable: true` — это hairline самого `ResizableHandle` (`w-px bg-border` в `web-ui/resizable/_resize/variants.ts`), он рендерится между structurally-resizable панелями всегда, независимо от `withHandle`/`handleDisabled`. Из зоны boost-layout это не чинится без структурного флипа (item.resizable=false → StaticInner → схлопывание панелей + ремоунт против toggle-stability).

## План рефакторинга / оптимизаций

- [x] **B2: Matrix relocation** — 2026-06-12. Matrix code moved from web-shell. Tests переехали вместе с кодом.
- [x] **B3: apps consumer-update** — 2026-06-12. Apps switch `Shell.Matrix` → `Layouts.Matrix` (this PR).
- [x] **Presets** — `appShellResolver`, `resolvePreset` мигрированы из shell (this PR).
- [x] **Toggle-stability** — 2026-06-16. `content.tsx` `renderContent()` function-call replaced with JSX `<Switch>` tree; DnD/Resize bindings hoisted to memos with engine-self-gating so toggle no longer flips the cell render shape. Bug 2 closed in same patch: `swap.getCellChildren` now feeds cells in all non-insert modes. Tests: `toggle-stability.test.tsx` (5 cases).
- [ ] **🚨 ЭСКАЛАЦИЯ architect → owner-web-ui: Resizable per-handle контракт (P0).** Для per-slot `resizable` override (слот `true` активен при `mode="view"`; `false` — выключен при edit) и для «бордер не зависит от resizable» нужно в `@capsuletech/web-ui` Resizable: (а) disabled handle не должен рисовать `bg-border` hairline (визуальный «бордер» слота обязан идти только из `bordered`); (б) per-item реактивный enable для handle (сейчас `withHandle`/`handleDisabled` — контейнер-левел, `IResizableItem.resizable` — структурный boolean; mixed per-slot состояния невыразимы без ремоунта панелей). После web-ui — плумбинг в matrix (эффективный флаг = `slot.resizable ?? resolved(mode, global)`; убрать hardcoded `resizable: true` у middle-row в app-shell пресете). (priority: P0 — вторая половина bug-репорта 2026-07-04)
- [ ] **Insert-движок: per-slot draggable override** — привести к тому же `isCellEnabled`-контракту, что и swap. (priority: P2)
- [ ] **Augmentation runtime hook** — coordinate с owner-web-core: `Object.assign(Ui.Layout, contributions)` на app boot. (priority: P0 — blocks Ui.Layout.Matrix UI consumer API)
- [ ] **TS module augmentation** — `declare module '@capsuletech/web-ui/layout' { interface ILayoutNamespace { Matrix: typeof Matrix } }`. (priority: P1, needs D5 runtime first)
- [ ] **Future heavy variants** — Bento, Dock, Masonry (TBD после Matrix stable). (priority: P3)
- [ ] **AI-anchor** `docs/_meta/boost-layout.md` — углублённая архитектура. (priority: P2)
