---
name: "@capsuletech/web-shell"
owner-agent: owner-web-shell
group: web_base
zone: domain
status: alpha
priority: P0
last-updated: 2026-07-03
---

# @capsuletech/web-shell

Reusable **app-shell blocks** (chrome with logic) shared across capsule apps —
tier-2 in the two-tier UI model.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `domain` — stateful feature-package, chrome для apps (Header / ModeToggle / Picker / ThemePicker / Appearance / FinishSettings / LocalePicker).
- **Status:** `alpha` (0.1.0) — chrome subpath работает; Matrix эвакуирована в `@capsuletech/boost-layout` (Phase B2 closed 2026-06-12 per ADR 046 D2 amend).
- **Priority:** **P0** — каждый capsule-апп тянет shell для chrome.
- **Maturity bar (до beta):**
  - Header block формализован (config-driven, ADR 032 useEmit).
  - `Controllers.Shell.*` HCA-адаптер.
  - `IShellCapability` контракт extracted в `web-contract` (если нужно cross-domain).
- **Active blockers:** нет.
- **Roadmap:**
  1. Header block (config-driven, через Shapes.Shell).
  2. `Controllers.Shell.*` finalize (ADR 032 useEmit).
  3. switcher-state coordination с owner-web-style (theme/layout-mode пересечения).
- **Last activity:** 2026-07-05 (Shell.SegmentNav + Shell.Launcher — nav connected-блоки,
  единое generic-событие `onSegmentNavigate`; brief pilot-segment-nav-3).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@capsuletech/web-core`** (workspace, dep) — HCA wrappers + ControllerProxy.
- **`@capsuletech/web-ui`** (workspace, dep) — primitives для chrome (Layout/Card/Toggle/...).
- **`@capsuletech/web-style`** (workspace, dep) — tokens, theme state, layout-mode.
- **`@capsuletech/web-intl`** (workspace, dep) — для chrome локализации.

## Allowed dependency zones (ADR 047 D2)

Domain-пакеты НЕ импортят друг друга напрямую. web-shell разрешено зависеть на:

- ✅ **kit** (`web-ui`)
- ✅ **runtime** (`web-core`, `web-style`, `web-intl`)
- ✅ **boost** (`boost-layout` потребляется apps'ами, не shell'ом; shell отдаёт chrome)
- ✅ **web-contract** (для cross-domain capability — например `IAuthCapability` для `is-authed?` логики в header)
- ❌ **другой domain** (`web-auth`, `web-agent`) — через контракт в `web-contract`.

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
| `./chrome` | tier-2 connected | `Header`, `ModeToggle`, `Appearance`, `FinishSettings`, `Picker`, `ThemePicker`, `LocalePicker` | Wired to `@capsuletech/web-style` / `@capsuletech/web-auth` stores; `useEmit` |
| `./ui` | tier-2 connected | Connected blocks: chrome (see `./chrome`) + nav blocks `SegmentNav`, `Launcher` | Pre-ADR 045 subpath; still the home of nav connected-блоков (brief pilot-segment-nav-3). learn импортит `SegmentNav`/`Launcher` напрямую из `/ui`. |
| `./controllers` | empty barrel | (placeholder for future Controllers.Shell.*) | Matrix Controller moved to `@capsuletech/boost-layout/controllers` per ADR 046 D2 (Phase B2). |
| `.` | convenience barrel | Re-exports `./ui` | |
| `./capsule` | pkg manifest | `defineCapsuleModule` (ADR 033) — `Shell` namespace (chrome only) | Depends on `@capsuletech/web-core`; runtime pending (phase 3). |

Изменение публичного API = breaking → coordinate с главным.

## Quirks / gotchas

- **`vt-route-content` on main slot** — `cell.id='main'` (in `app-shell` preset and
  raw rows alike) automatically receives CSS class `vt-route-content`, which maps to
  `view-transition-name: capsule-content` defined in `@capsuletech/web-style/index.css`.
  This makes the main content region animate on nested navigation while chrome
  (header/sidebar/footer) stays static — zero app boilerplate needed.
  Uniqueness is guaranteed by convention: only `cell.id='main'` gets the class, and
  a well-formed shell has exactly one such cell at a time. If two `Matrix` instances
  with `id='main'` cells are in the DOM simultaneously, the browser will warn about a
  duplicate `view-transition-name`; pass a custom class override or use raw rows without
  `id='main'` on the second Matrix to avoid this. The class is inert when View
  Transitions are disabled (`view-transition-name` with no active transition = no-op).
  Apps that previously wrapped `Ui.Outlet` in `<... class="vt-route-content">` manually
  should remove that wrapper — Matrix now provides the region automatically.

- **`SegmentNav` + `Launcher` — nav connected-блоки** (`src/ui/segmentNav/`,
  `src/ui/launcher/`, brief pilot-segment-nav-3). Пилот дедупа Nav/Welcome (канон
  product-wide kit layering): shell собирает connected app-блок из stateless-визуала
  (web-ui `SegmentedBar` / `Launcher`) + path-хелпера (web-router `useActiveSegment`) +
  emit. `SegmentNav` подсвечивает активный сегмент производной от URL
  (route-prefix-агностично); `Launcher` — hero + грид разделов, роутер ему не нужен.
  **Единое generic-событие** (решение user): оба блока эмитят ОДНО
  `onSegmentNavigate { nav, segment }` (`ISegmentNavEvents`, живёт в `segmentNav/`);
  app-Feature различает источник по `nav`-дискриминатору, а не по имени события.
  Emit через `useEmitOptional` (могут рендериться вне host-scope, прецедент Picker).
  **Ноль сырых классов** — весь визуал в web-ui; shell только `class`-passthrough.
  web-router добавлен в `dependencies` (runtime-зона, ADR 047 D2 allowed).
- **`Picker` — generic каркас селекта** (`src/ui/picker/`, brief shell-generic-picker
  2026-07-03). Канон: шелл раздаёт каркасы селектов, апп раздаёт данные (с бэка).
  Доменные пикеры = `Picker` + данные аппа — VoicePicker/LocalePicker-подобные блоки
  в шелле НЕ заводим. `ThemePicker` — тонкий wrapper над `Picker` (тематические
  дефолты: DISCOVERED_THEMES / useTheme / setTheme / Palette / 'Тема'), его публичный
  контракт `IThemePickerProps` не менялся. При выборе Picker эмитит named-event
  `onPick { name, value }` через `useEmitOptional` (ADR 032; optional — контрол может
  рендериться вне host-scope, прецедент ComponentsPalette); `onSelect`-prop — инжект-путь
  (ADR 041: событие = роль, инжект = опция), порядок `onSelect → emit → onChange`.
- **`/ui` web-core exception:** правило «`/ui` не импортит `@capsuletech/web-core`»
  имеет одно каноничное исключение — `useEmitOptional` для named-events connected-блоков
  (ADR 032, зафиксировано brief'ом shell-generic-picker). Остальной web-core
  (wrappers, module, engine) в `/ui` по-прежнему запрещён.
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
- [ ] **Unit tests** — `Header`, `Picker`, `ThemePicker` covered (2026-07-03).
  Remaining: `ModeToggle` (descriptor resolution, toggle wiring). At the web-ui
  boundary, not lucide. (priority: medium)
- [ ] **ADR 033 registration** — `./capsule` manifest is in place but the runtime
  is pending (phase 3). Apps import from `./ui` directly until then. (priority: low)
- [x] **Package scaffold** — multi-entry build, two-tier model, config-driven
  ModeToggle + ThemePicker migrated from web-ui composites. (2026-06-05)

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `src/**/__tests__/` | `Header` (compound, batch, capability filtering), `Picker` (options, checkmark, select flow, emit onPick, standalone/sub), `ThemePicker` (wrapper contract 1:1), `SegmentNav` (items/class passthrough, activeId из useActiveSegment, emit onSegmentNavigate), `Launcher` (items/hero passthrough, emit onSegmentNavigate) |
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
