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
- **Status:** `scaffold` — пакет создан с пустыми exports (B1, PR-C). Matrix-код переезжает из `web-shell` в Phase B2 (отдельный coordinate-PR с owner-web-shell).
- **Priority:** P1 — нужен apps/playground+ewc для замены `Ui.Layout.Grid` на `Ui.Layout.Matrix` (resize/DnD/persist).
- **Maturity bar (scaffold → alpha):**
  - Matrix-код перевезён из web-shell (B2).
  - `Ui.Layout` augmentation runtime реализован (B2 / D5 implementation).
  - `apps/*` потребители обновлены под `<Ui.Layout.Matrix/>` (B3).
  - Unit-тесты переехавшего Matrix-кода зелёные.
- **Active blockers:**
  - Phase D5 augmentation runtime hook (Object.assign Ui.Layout) ещё не реализован в `web-core` — пока работаем через `Layouts.*` ADR 033 registry.
  - B2 ждёт coordination с owner-web-shell (strip Matrix из shell).
- **Roadmap:**
  - B2 — relocate Matrix code (cooperate PR с web-shell).
  - B3 — apps consumer-update.
  - Presets API (`app-shell`, `studio`, `dashboard`).
  - Future heavy variants: Bento, Dock, Masonry (TBD).
- **Last activity:** 2026-06-12 — B1 scaffold (this PR).

## Vendor stack (ADR 047 D3)

- **corvu** (`@corvu/resizable` `^...`) — resizable-panel primitive. https://corvu.dev/
- **@capsuletech/web-dnd** (workspace) — pointer-based DnD для region-swap (per ADR 040).
- **Solid.js** (`^1.9.12`) — реактивный движок.

Versions будут зафиксированы при B2 (когда Matrix-код реально приедет с deps).

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

После B2:
- `.` (main) — barrel re-export Matrix + presets + persistence stores + types.
- `./capsule` — ADR 033 manifest (`defineCapsuleModule({ name: 'Layouts', components: { Matrix } })`).

Сейчас (B1 scaffold):
- `.` — пустой barrel (`export {}`).
- `./capsule` — `defineCapsuleModule({ name: 'Layouts', components: {} })` placeholder.

## Quirks / gotchas

- **Augmentation pattern (ADR 046 D5)** — `Ui.Layout.Matrix` доступ работает через runtime augmentation hook (TBD в D5 implementation). До его готовности консьюмеры используют `Layouts.Matrix` (ADR 033 global namespace).
- **Naming `Layouts` (plural) vs `Ui.Layout` (singular)** — `Layouts` это programmatic global registry (ADR 033 mirror of `Maps`, `Tables`, ...); `Ui.Layout` это UI-namespace в kit (`{ Flex, Grid, ... }`). Mirror of how boost-map имеет `Maps.View` + kit имеет `Ui.Map.View`.

## План рефакторинга / оптимизаций

- [ ] **B2: Matrix relocation** — cooperate PR с owner-web-shell. Move `packages/web/domain/shell/src/matrix/**` → `packages/web/boost/layout/src/`. Strip `/matrix` + `/layout` subpaths из web-shell. Tests переезжают вместе с кодом. (priority: P1)
- [ ] **B3: apps consumer-update** — replace `@capsuletech/web-shell/matrix` imports → `<Ui.Layout.Matrix/>` via boost-layout. (priority: P1)
- [ ] **Presets** — `app-shell`, `studio`, `dashboard` (мигрируют из shell вместе с Matrix). (priority: P1)
- [ ] **Augmentation runtime hook** — coordinate с owner-web-core: `Object.assign(Ui.Layout, contributions)` на app boot. (priority: P0 — blocks Ui.Layout.Matrix consumer API)
- [ ] **TS module augmentation** — `declare module '@capsuletech/web-ui/layout' { interface ILayoutNamespace { Matrix: typeof Matrix } }`. (priority: P1)
- [ ] **Future heavy variants** — Bento, Dock, Masonry (TBD после Matrix stable). (priority: P3)
