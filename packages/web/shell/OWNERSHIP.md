---
name: @capsuletech/web-shell
owner-agent: owner-web-shell
group: web_base
status: pre-1.0
last-updated: 2026-06-11
---

# @capsuletech/web-shell

Reusable **app-shell blocks** (chrome with logic) shared across capsule apps —
tier-2 in the two-tier UI model.

## Two-tier model

| Tier | Where | What |
|---|---|---|
| **Tier 1 — stateless composites** | `@capsuletech/web-ui` | Arrange primitives, emit events, hold no store (Card, previewCard, dataTable). |
| **Tier 2 — connected blocks** | `@capsuletech/web-shell` (this pkg) | Logic-bearing chrome: mode toggles, theme picker, and — later — Header. Bound to module-level state in `@capsuletech/web-style`. |

Decision rule: **holds behaviour/state → tier 2 here; only arranges
presentation and emits → tier 1 in web-ui.**

## Зона ответственности

### Owns
- `packages/web/shell/src/` (полностью) — one folder per block under `src/ui/`.
- `packages/web/shell/vite.config.mts`, `vitest.config.ts`, `tsconfig.json`.
- `packages/web/shell/package.json` exports / deps.

### Не трогает
- State stores (`use*/toggle*` switcher signals) — those live in and are owned
  by `@capsuletech/web-style`. This package **consumes** them, never redefines.
- UI primitives (`Toggle`, `Dropdown`, icons) — owned by `@capsuletech/web-ui`.
  Need a missing primitive → add it there via owner-web-ui, don't hand-roll here.
- Root `tsconfig.base.json`, `nx.json`, `capsuleConfig.ts` optimizeDeps — главный.
- `apps/*/` — framework-developer / user scope.

## Публичный API

Per ADR 045 the package exposes two tiers as dedicated subpaths:

| Subpath | Tier | What | Notes |
|---|---|---|---|
| `./layout` | tier-1 stateless | `Matrix`, `Region`, `Cell`, `appShellResolver`, `resolvePreset` | No stores, no `useEmit`, no DOM side-effects |
| `./chrome` | tier-2 connected | `Header`, `ModeToggle`, `Appearance`, `FinishSettings`, `ThemePicker`, `LocalePicker` + `Controllers.Shell` | Wired to `@capsuletech/web-style` / `@capsuletech/web-auth` stores; `useEmit` |
| `./matrix` | **deprecated alias** | Same surface as `./layout` | Soft-deprecated; consumers migrate to `./layout` on next touch. Will be removed in a future major version. |
| `./ui` | (legacy) | Connected blocks only (no controllers) | Pre-ADR 045 subpath; still works, prefer `./chrome` for new consumers. |
| `./controllers` | (legacy) | `MatrixController`, `IMatrixEvents` | Pre-ADR 045 subpath; still works, prefer `./chrome` for new consumers. |
| `.` | convenience barrel | Re-exports `./ui` | |
| `./capsule` | pkg manifest | `defineCapsuleModule` (ADR 033) | Depends on `@capsuletech/web-core`; runtime pending (phase 3). |

Изменение публичного API = breaking → coordinate с главным.

## Quirks / gotchas

- **Depth-scoped `view-transition-name` on main slot (ADR 045 #3)** — `cell.id='main'`
  automatically receives inline `style="view-transition-name: capsule-content-${depth}"`
  where `depth` is read from `useRouteDepth()` (`@capsuletech/web-router`). Nested
  layouts (e.g. workspace → web-studio sub-tabs) each get their own animation group
  instead of sharing the constant `capsule-content`, preventing rip/flash on
  sub-navigation. CSS class `vt-route-content` is kept alongside for backwards-compat
  with the existing web-style selector; the selector will be widened to match the
  `capsule-content-*` pattern in follow-up PR 5c (owner-web-style). Root app-shell
  renders at depth 0 → `capsule-content-0`.

- **`ModeToggle` is config-driven** (`src/ui/modeToggle/`). One component for all
  boolean app-modes via `IModeDescriptor` — replaced the four near-identical
  `*ModeToggle` components deleted from `@capsuletech/web-ui/composites`. Built-in
  keys (`dark/dnd/resize/settings`) map through `MODES` to the web-style switcher;
  consumers may pass a custom descriptor inline.
- **Icons come through `@capsuletech/web-ui/icons`**, not `lucide-solid` directly —
  web-ui is the single owner of lucide. No lucide dep/inline in this package.
- **`/ui` must not import `@capsuletech/web-core`** — only `/controllers` and
  `/capsule` may. Keeps the stateless-ish block subpath framework-agnostic and
  tree-shakeable.
- **Folder-per-block under `src/ui/`** — Header and future blocks add a sibling
  folder (`src/ui/header/`), never flat files at `src/ui/` root.

## План рефакторинга / оптимизаций

- [ ] **Header block** — navigation + menu currently duplicated in every app's
  `workspaceMenu`. Lands as `src/ui/header/` (presentation) + `Controllers.Shell`
  (active route / menu FSM via `useEmit`). (priority: high)
- [ ] **Unit tests** — none yet. Add render tests for `ModeToggle` (descriptor
  resolution, toggle wiring) + `ThemePicker` (standalone/sub). At the web-ui
  boundary, not lucide. (priority: medium)
- [ ] **ADR 033 registration** — `./capsule` manifest is in place but the runtime
  is pending (phase 3). Apps import from `./ui` directly until then. (priority: low)
- [x] **Package scaffold** — multi-entry build, two-tier model, config-driven
  ModeToggle + ThemePicker migrated from web-ui composites. (2026-06-05)

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `src/**/__tests__/` | (none yet — see refactor plan) |
| E2E | `packages/cli/e2e/smoke.mjs` | косвенно через app scenarios |

**Перед изменением:** `pnpm --filter @capsuletech/web-shell test` (green).
**При breaking change:** обновить tests + Публичный API секцию.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| Switcher state (`use*/toggle*`), themes, `cn` | owner-web-style |
| UI primitives (`Toggle`, `Dropdown`), icons | owner-web-ui |
| HCA wrappers, `defineCapsuleModule`, `useEmit` | owner-web-core |
| Vite plugins / lib-builder | owner-builders |

## Release group

- `web_base` — fixed group, tag `web@{version}`. **Not yet a member** — joins the
  group when first released (matches the web-agent precedent: real packages stay
  out of the release set until release-ready). Координировать release через главного.
