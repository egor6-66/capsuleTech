---
title: web-rework-plan
description: Live execution plan для rework'а triada ADR 046 + 047 + 048. Обновляется по мере мерджа PR'ов.
status: documented
last_updated: 2026-06-12 (D1 5/5 DONE; ADR 046 amended — augmentation pattern + boost-matrix→boost-layout + boost-charts→boost-chart; B-фаза перенумерована)
---

# web-rework execution plan (per ADR 046 + 047 + 048)

> **Источник правды для архитектуры:** триада [[046-boost-namespace-matrix-evict-vt-owner|ADR 046]] (точечная тактика) + [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] (крыша / zones / cycle canon / vendor transparency / studio rename) + [[048-docs-as-data|ADR 048]] (docs infrastructure). Эта дока — live status tracker: фазы, агенты, dispatch-порядок, PR'ы.

## Workflow (этот rework)

- **Я (главный assistant)** — архитектура, ADR'ы, plan-doc maintenance, верификация по плану, координация. **НЕ дёргаю агентов через Agent-tool** в этом rework'е.
- **USER** — дирижирует. По phase-step'у читает мой draft brief'а, дёргает нужного owner-агента в отдельной сессии (или себя как coordinator'а).
- **Owner-агенты** — работают по drafted brief'у, общаются с user'ом в своей сессии, репортят back. Если нужен другой агент — говорят user'у.
- Я обновляю plan-doc по результатам (status, PR-ссылки, blockers).

Это **shift relative to Phase 0** (где я гонял `Agent` tool). Причины: распараллеливание via real sessions, меньше context-bloat для меня, фокус на правильности vs координации.

## Состояние на старте rework (2026-06-11)

- **main HEAD**: `ab90ae8` (PR #297 web-style cleanup).
- **Phase 0 закрыто** до этого rework'а:
  - ADR 045 (#292) — фиксирована таксономия (`#1 shell split` теперь private invalid per ADR 046).
  - web-audit (#293) — снимок 23 пакетов.
  - Button canon pilot (#294) — Vitest browser-bar + canon-форма.
  - web-shell `/layout` + `/chrome` subpaths (#295) — `/layout` будет удалён в Phase B (per ADR 046).
  - solid-js peerDep sync (#296) — hygiene.
  - web-style editor drop (#297) — dead code.
- **Open ad-hoc**:
  - PR #298 (useRouteDepth via useMatches) — merged, impl будет переписан в Phase C; контракт hook'а сохраняется.
  - PR #299 — закрыт без мерджа (Matrix-side vt-name consume — wrong layer per ADR 046 Decision 4).
- **Parallel WIP в дереве (НЕ rework'а):**
  - Menu trajectory (web-ui composites/menu, icons/registry) — owner-web-ui другая ось.
  - playground/apps/* — user активная работа.
  - web-auth, web-core/ui-kit/imports — другая работа.
  - backend, docs, lockfile, tsconfig.base.json — частично shared infra.

## Agent roster

### Существующие owner-агенты — годятся as is

| Agent | Зона | Использование в rework |
|---|---|---|
| `owner-web-shell` | `packages/web/shell/` | Phase B2: strip matrix + /matrix + /layout subpaths |
| `owner-web-router` | `packages/web/router/` | Phase C1: CapsuleOutlet + DepthContext + useRouteDepth rewrite |
| `owner-web-style` | `packages/web/style/` | Phase C3: enumerate CSS селекторы |
| `owner-web-ui` | `packages/web/ui/` | Phase B6: Ui.Map/Flow/Chart placeholders |
| `owner-boost-table` | `packages/web/table/` | Phase B4: rename → `boost-table` |
| `owner-boost-map` | `packages/web/map/` | Phase B5: rename → `boost-map` |
| `owner-boost-flow` | `packages/web/flow/` | Phase B5: rename → `boost-flow` |
| `owner-boost-charts` | `packages/web/charts/` | Phase B5: rename → `boost-charts` |

⚠️ Для rename'ов: ИЛИ rename'им owner-* (изменив агент-файл .claude/agents/owner-web-X.md), ИЛИ оставляем имя owner-web-X но скоуп указывает `@capsuletech/boost-X`. Рекомендация — переименовать агентов, чтобы registry читался прямо (требует restart, см. ниже).

### Новые owner-агенты — нужно создать

| Agent | Зона | Создаётся когда |
|---|---|---|
| `owner-boost-layout` ⚠ | `packages/web/boost/layout/` (новый пакет per ADR 047 D1) | Phase A2 — перед Phase B1 |

⚠ **Amendment 2026-06-12**: agent изначально планировался как `owner-boost-matrix`, переименован в `owner-boost-layout` per ADR 046 Decision 1 amend (Matrix — это implementation detail внутри boost-layout, не отдельный booster).

При rename'е web-X → boost-X логично переименовать и owner-агенты — единое чтение скоупа.

### Main steward (главный assistant, я)

Зона:
- ADR'ы (046 и любые follow-up).
- `tsconfig.base.json`, `nx.json`, root `package.json` — shared infra.
- `packages/web/core/src/ui-kit/imports.tsx` — Ui.* injection (cross-package coordination).
- `apps/*` import-fixes под новые package names + ui-kit swap-ы (или page-агенты per app).
- Координация phase-dispatch'ей.
- Verdaccio release-flow синхронизация (если пакеты публикуются).

## Phase A — Foundation (sequential)

> Цель: ADR 046 в main + новый агент `owner-boost-matrix` в registry, готов к invoke.

### A0 — ADR 046 merge

- **Owner:** main steward.
- **Files:** `docs/01-architecture/adr/046-boost-namespace-matrix-evict-vt-owner.md` (new), `docs/_meta/web-rework-plan.md` (new, эта дока).
- **PR**: scope-PR `docs(adr): 046 boost namespace + matrix evict + vt-name owner (this doc)`.
- **CI**: only Lint/Ownership canon/Semantic.
- **Blocks:** ничего из B/C не начинаем до merge'а.
- **Status:** PENDING.

### A1 — Создать `owner-boost-matrix` agent

- **Owner:** USER (создание `.claude/agents/owner-boost-matrix.md` — main steward предлагает скелет, user применяет).
- **Контракт агента:**
  - Зона: `packages/web/boost-matrix/`
  - Знает: Matrix grid + corvu/resizable + capsule web-dnd + persistence stores.
  - Делает: move Matrix code из web-shell, publish API `Matrices.*` через ADR 033 регистрацию, держит OWNERSHIP, тесты, релиз.
  - НЕ делает: web-shell chrome (чужая зона), apps/* (consumers).
- **Restart Claude Code session** — иначе registry не подхватит новый агент ([[new-agent-needs-restart]]).
- **Status:** PENDING (после A0 merge).

### A2 — (опц) Rename owner-web-{table,map,flow,charts} → owner-boost-{...}

- **Owner:** USER (file moves в `.claude/agents/`).
- Если делается — restart session после.
- **Status:** PENDING (можно отложить, агенты работают и под старым именем со скоупом booster-пакета).

---

## Phase W — Web-space canon (main steward; pure docs + mechanical renames)

> Цель: zone canon зафиксирован документально, OWNERSHIP всех 23 пакетов обновлён по новому template'у (Состояние + Vendor stack), README per-package на едином template'е, L0/L1 gradient + manifest schema задокументирована, boost-* renames выполнены **одним atomic-PR'ом** (mechanical, без functional touch).
>
> **Rationale:** USER указал что web-space сейчас на main steward (canon + порядок, не функционал). Renames B4-B7 mechanical → переносятся сюда (один PR vs четыре per-owner), boost-renames приземляются в задокументированный canon (W1+W3 first).
>
> Phase W **параллельна Phase C** (vt-rework, owner-web-router) и не блокирует A1+B1 (boost-matrix scaffold).

### W1 — Zone canon docs

- **Owner:** main steward.
- **Files:** `docs/_meta/web-zones/{kit,runtime,domain,boost,studio}.md` + `index.md` (post-D6 zone rename).
- **Содержание per zone:** Purpose / Packages / Import rules / Canonical shape / Vendor stack / Non-goals / New package checklist.
- **PR:** `docs(web-zones): zone canon docs + L0/L1 gradient + Phase W plan-doc (adr 047 D1)`.
- **Blocks:** ничего (это canon-only, не gates функциональные шаги).
- **Status:** **DONE** (2026-06-11 — этот PR-bundle).

### W2 — OWNERSHIP refresh + README per-package

- **Owner:** main steward.
- **Steps:**
  1. Пройти по 23 пакетам `packages/web/*/OWNERSHIP.md` — добавить/обновить **Состояние** (zone / status / priority / maturity / blockers / roadmap / last activity) per [[OWNERSHIP-template]] и **Vendor stack** (главные вендоры + ссылки upstream) per ADR 047 D3.
  2. Создать README.md для 11 пакетов которые без него (access, agent, auth, charts, contract, creator, date, flow, intl, shell, table) + апдейт 12 существующих под единый README template:
     ```
     # @capsuletech/<name>
     <one-line>  · zone: <kit|runtime|domain|boost|studio>  · status: ...
     ## Install
     pnpm add @capsuletech/<name>
     ## Minimum usage
     <5-10 строк кода>
     ## Subpath exports  (если есть)
     ## Docs
     - AI-anchor: docs/_meta/<name>.md
     - OWNERSHIP: ./OWNERSHIP.md
     ```
  3. Создать `docs/_meta/readme-template.md` (правила + skeleton).
- **PR:** `docs(packages): OWNERSHIP state+vendor stack + README per-package (adr 047 D3 / W2)`. Один coordinator-PR (parallel WIP не трогаем).
- **CI:** OWNERSHIP canon gate должен пропустить (новые секции — расширение, не nullification старых).
- **Blocks:** ничего критичного.
- **Status:** PENDING (после W1, параллельно с W6).

### W3 — L0/L1 gradient + manifest schema

- **Owner:** main steward.
- **Files:** `docs/_meta/web-ui.md` — секция «Weight gradient & size manifest».
- **Содержание:** критерий L0/L1, initial seed list, manifest.json schema для studio, bundle-size assertion spec для W4, rejected alternative (отдельный `web-primitives` пакет).
- **PR:** включён в W1 PR `docs(web-zones): zone canon docs + L0/L1 gradient + Phase W plan-doc`.
- **Blocks:** W4 (implementation).
- **Status:** **DONE** (2026-06-11 — этот PR-bundle).

### W4 — Bundle-size + manifest infra (owner-web-ui)

- **Owner:** `owner-web-ui` (functional code touch, делегируется).
- **Steps:**
  1. `packages/web/ui/test/bundle-size.test.ts` — vitest assertions per L0-subpath: < N kB gzip + НЕ содержит `@kobalte/core/<interactive-set>` (allowlist: polymorphic / separator / skeleton). Owner-web-ui калибрует N на seed list'е.
  2. `packages/web/ui/scripts/build-manifest.ts` (или Vite plugin) — генерит `dist/manifest.json` per IWebUiManifest shape ([[web-ui]] раздел manifest).
  3. CI drift-guard: manifest.json регенерится → diff в CI = failure (forces commit manifest).
  4. OWNERSHIP «Состояние» — отметить manifest infra ready.
- **PR:** `feat(web-ui): bundle-size assertions + manifest.json for studio (W4 / adr 047)`.
- **Blocks:** Studio palette badge (Phase E4 enhancement post D4).
- **Status:** PENDING (после W3 — DONE → готов к dispatch'у).

### W5 — Cross-package import inventory (baseline для domain-isolation)

- **Owner:** main steward.
- **Steps:**
  1. Snapshot `pnpm why @capsuletech/web-{auth,shell,agent}` + grep cross-domain imports в текущем дереве.
  2. Документировать в `docs/_meta/web-audit-cross-imports.md` — baseline для ADR 047 D2 enforcement (если есть cross-domain — flag'аем, либо extract в contract на Phase D2).
- **PR:** включить в W2 PR-bundle или отдельный мелкий `docs(web-audit): cross-domain import baseline (adr 047 D2 / W5)`.
- **Blocks:** Phase D2 (contract setup только если W5 показал нужду).
- **Status:** PENDING (после W2).

### W6 — Boost-renames `@capsuletech/web-{table,map,flow,charts}` → `@capsuletech/boost-*`

- **Owner:** main steward (один atomic PR; пакеты mechanical-touch).
- **Steps:**
  1. `packages/web/{table,map,flow,charts}/package.json` — `name` → `@capsuletech/boost-*` (4 файла).
  2. `tsconfig.base.json` paths — добавить `@capsuletech/boost-*`, оставить `@capsuletech/web-*` aliases для grace period (один минор).
  3. `packages/builders/vite/src/defines/capsuleConfig.ts` — `optimizeDeps.exclude` обновить.
  4. `scripts/release-local.mjs` — release groups обновить.
  5. `apps/*` + `packages/*` consumers — replace `@capsuletech/web-{table,map,flow,charts}` → `boost-*`. ESLint codemod или ручной sed.
  6. `docs/_meta/{web-table,web-map,web-flow,web-charts}.md` — title + содержимое apdate (или rename на `boost-*.md` с redirect-shim'ом — обсудим).
  7. AI-anchor `OWNERSHIP.md` каждого: `name:` frontmatter обновить.
  8. Lockfile sync.
- **PR:** `chore(boost-*): rename web-{table,map,flow,charts} → @capsuletech/boost-* (adr 046 D1 / W6)`. Один atomic PR.
- **CI:** standard build/typecheck/test + e2e smoke.
- **Параллельность:** идёт параллельно W2 (разные файлы) + параллельно Phase C (vt-rework, разные пакеты).
- **Не делает:**
  - НЕ переименовывает agent-файлы `.claude/agents/owner-web-{table,map,flow,charts}.md` → `owner-boost-*` — это **отдельный PR** после W6 merge'а + restart-нот ([[new-agent-needs-restart]]). Главный assistant подготовит отдельный agent-rename PR.
  - НЕ трогает функциональность пакетов — `import { DataTable } from '@capsuletech/boost-table'` ровно так же работает как раньше из `web-table`.
- **Blocks:** A2 (rename owner-agents) если делаем — после W6.
- **Status:** PENDING (после W1 для canon-готовности).

### W7 — Plan-doc update (этот шаг)

- **Owner:** main steward.
- **Files:** этот документ — Phase W вставлен, B4-B7 помечены absorbed→W6, live status таблица обновлена.
- **PR:** включён в W1 PR-bundle.
- **Status:** **DONE** (2026-06-11).

---

## Phase B — Booster sweep (parallel-friendly)

> Цель: Matrix эвакуирована в boost-layout; renames web-{table,map,flow,charts} → boost-X (singular) завершены; kit-namespace'ы `Ui.{Map,Flow,Chart}.*` готовы под augmentation pattern (ADR 046 Decision 5).
>
> ⚠ **Amendment 2026-06-12** (после Phase D1):
> - `boost-matrix` → `boost-layout` (расширяет `Ui.Layout`, не отдельный namespace).
> - `boost-charts` → `boost-chart` (singular, консистентность с `Ui.Chart`).
> - B6 placeholder'ы реструктурируются: `Ui.MapView` → `Ui.Map.View`, `Ui.FlowDiagram` → `Ui.Flow.Diagram`, `Ui.Chart` → `Ui.Chart.<basic>` (namespace-form для augmentation).

### B1 — `@capsuletech/boost-layout` scaffold

- **Owner:** main steward (initial scaffold) → handoff `owner-boost-layout`.
- **Steps:**
  1. Создать `packages/web/boost/layout/` директорию через CLI: `nx g @nx/js:library --name=@capsuletech/boost-layout --directory=packages/web/boost/layout --importPath=@capsuletech/boost-layout --publishable --buildable`.
  2. `tsconfig.base.json` paths — добавить алиас `@capsuletech/boost-layout` + `/capsule` subpath.
  3. `vite-builder` `optimizeDeps.exclude` — добавить.
  4. OWNERSHIP.md per template (zone: boost; augments: Ui.Layout).
  5. Empty `src/index.ts` + `src/capsule.ts` (ADR 033 manifest: `augments: 'Ui.Layout', contributions: {}` initially empty — Matrix добавляется в B2).
  6. TS module augmentation stub (`src/types.d.ts`): `declare module '@capsuletech/web-ui/layout' { interface ILayoutNamespace { Matrix?: ... } }` — initially commented or empty.
  7. Handoff: после scaffold-merge — `owner-boost-layout` берёт пакет.
- **PR:** `feat(boost-layout): scaffold new package (adr 046)`.
- **Blocks:** B2.
- **Status:** PENDING (после A0+A1+D1 готовы; D1 closed 2026-06-12).

### B2 — Move Matrix code из web-shell в boost-layout

- **Owner:** `owner-boost-layout` (приёмная сторона) + `owner-web-shell` (donor — strip).
- Координация: либо ОДИН PR (boost-layout принимает + web-shell strip в одном PR, два owner'а cooperate), либо два последовательных. Рекомендация — **один cooperate PR** через main steward координацию.
- **Files moving:** `packages/web/domain/shell/src/matrix/**` → `packages/web/boost/layout/src/matrix/**`.
- **Files updated in shell:**
  - `packages/web/domain/shell/src/layout/index.ts` (re-export matrix) — **удалить**.
  - `packages/web/domain/shell/src/chrome/index.ts` — оставить.
  - `packages/web/domain/shell/package.json` exports — удалить `./matrix`, `./layout`. Оставить `./chrome` и root.
  - `vite.config.mts` — убрать matrix-entry.
  - `OWNERSHIP.md` — секция «Публичный API» очистить от matrix; пометить Decision 2 ADR 046.
- **Augmentation:** `boost-layout/src/capsule.ts` обновляется — `contributions: { Matrix }`. TS module augmentation активируется.
- **Tests:** matrix-тесты переезжают вместе с кодом.
- **PR:** `feat(boost-layout,web-shell): relocate matrix into dedicated booster package (adr 046)`.
- **CI:** требует boost-layout dist (B1 merged); требует обновлений lockfile.
- **Blocks:** B3.
- **Status:** PENDING.

### B3 — Apps imports update под `boost-layout`

- **Owner:** main steward ИЛИ per-app page-агенты.
- **Steps:** найти все `@capsuletech/web-shell/matrix` импорты в `apps/*` → заменить на `Ui.Layout.Matrix` (через capsule.config.ts подключение boost-layout). Обновить `app/package.json` deps. Lockfile sync.
- **PR(s):** per-app `chore(<app>): switch Matrix consumption to Ui.Layout.Matrix via boost-layout (adr 046)`.
- **CI:** требует B2 merged.
- **Status:** PENDING.

### B4 — B5 (renames) — ABSORBED → W6

> Renames `@capsuletech/web-{table,map,flow}` → `@capsuletech/boost-{table,map,flow}` выполнены атомарно в Phase W6 (PR #306).
>
> **Status:** ABSORBED → W6.

### B5b — `boost-charts` → `boost-chart` rename ⚠ amend

- **Owner:** main steward.
- **Steps:**
  1. `packages/web/boost/charts/package.json` — `name: @capsuletech/boost-charts` → `@capsuletech/boost-chart`.
  2. `git mv packages/web/boost/charts → packages/web/boost/chart`.
  3. `tsconfig.base.json` paths — `@capsuletech/boost-chart` (+ grace alias `@capsuletech/boost-charts`).
  4. `nx.json` release group — обновить (`boost-charts` → `boost-chart`).
  5. Apps consumers (если есть) — replace.
- **PR:** `refactor(boost-chart): rename from boost-charts singular (adr 046 amend)`.
- **Bundle:** идёт в одном PR с agent rename + B6 namespace restructure (PR-B этой волны).
- **Status:** PENDING.

### B6-placeholder — Ui.{Map,Flow,Chart} restructure под augmentation namespace

- **Owner:** main steward (PR-B этой волны) — mechanical rename.
- **Steps:**
  1. `packages/web/kit/ui/src/primitives/map/` — restructure `Ui.MapView` flat → `Ui.Map.View` namespace.
  2. `packages/web/kit/ui/src/primitives/flow-diagram/` → `flow/` (или оставить, поменять exports) — `Ui.FlowDiagram` → `Ui.Flow.Diagram`.
  3. `packages/web/kit/ui/src/primitives/chart/` — `Ui.Chart` single → `Ui.Chart.<basic>` namespace-form (TBD имя basic варианта: `Basic`/`Static`/`Placeholder`).
  4. `packages/web/runtime/core/src/ui-kit/imports.tsx` — обновить инжекции: `MapView` → `Map.View`, `FlowDiagram` → `Flow.Diagram`, `Chart` → `Chart.<basic>`.
  5. `tsconfig.base.json` paths — обновить subpath'ы web-ui (`map/flow-diagram/chart` exports).
  6. Apps consumers (если уже использовали placeholder'ы) — replace.
- **PR:** Bundle с B5b + agent rename.
- **Status:** PENDING.

---

## Phase C — vt-name rework (sequential, параллельна Phase B)

> Цель: routing-animation работает корректно для вложенных Outlet'ов; CapsuleOutlet — единая точка владения vt-name; Matrix очищается от useRouteDepth.

### C1 — `owner-web-router` — CapsuleOutlet + DepthContext + useRouteDepth rewrite

- **Owner:** `owner-web-router`.
- **Steps:**
  1. New file `src/CapsuleOutlet.tsx` — Solid компонент:
     ```tsx
     import { Outlet } from '@tanstack/solid-router';
     import { createContext, useContext, type ParentComponent } from 'solid-js';

     const DepthCtx = createContext<number>(-1);

     export const CapsuleOutlet: ParentComponent = () => {
       const parent = useContext(DepthCtx);
       const depth = parent + 1;
       return (
         <DepthCtx.Provider value={depth}>
           <div
             class="vt-route-content"
             style={{ 'view-transition-name': `capsule-content-${depth}` }}
           >
             <Outlet />
           </div>
         </DepthCtx.Provider>
       );
     };

     export const useRouteDepth = (): (() => number) => {
       const depth = useContext(DepthCtx);
       return () => Math.max(0, depth);
     };
     ```
  2. `src/index.ts` — export `CapsuleOutlet`. `useRouteDepth` уже экспортирован (PR #298), impl меняется.
  3. **Drop** старый `useRouteDepth.ts` (через useMatches) — заменить на новый файл (или inline в CapsuleOutlet.tsx).
  4. Tests `__tests__/CapsuleOutlet.test.tsx` — render с разными DepthCtx.Provider nesting, проверка depth-output, vt-name строки.
  5. Drop старый `useRouteDepth.test.ts` (через useMatches mock'и) — переписать под Provider-based.
  6. OWNERSHIP.md — обновить «Публичный API» (CapsuleOutlet добавился; useRouteDepth impl изменился).
- **PR:** `refactor(web-router): CapsuleOutlet + DepthContext owns vt-name (adr 046)`.
- **CI:** standard. Тесты должны зеленеть на новом mock-flow.
- **Blocks:** C2.
- **Status:** PENDING.

### C2 — Ui.Outlet swap + apps/playground web-studio Outlet fix

- **Owner:** main steward.
- **Steps:**
  1. `packages/web/core/src/ui-kit/imports.tsx` — `Outlet` инжекция меняется с `@tanstack/solid-router`'s `Outlet` на `@capsuletech/web-router`'s `CapsuleOutlet`. (Имя `Ui.Outlet` сохраняется — публичный API consumers'ов.)
  2. `packages/web/core/package.json` — peerDep `@capsuletech/web-router` добавить если ещё нет.
  3. `apps/playground/src/pages/workspace/web-studio/index.tsx` — заменить `<div>wdad</div>` на `<Ui.Outlet/>`. Параллельно проверить остальные web-studio sub-routes (design/logic/monitor) на корректность outlet-цепочки.
  4. Lockfile sync.
- **PR:** `feat(web-core,playground): Ui.Outlet = CapsuleOutlet + web-studio outlet fix (adr 046)`.
- **CI:** standard.
- **Blocks:** C3 (style enumerate должен следовать после swap, чтобы CSS не лип в стейл-классе).
- **Status:** PENDING.

### C3 — `owner-web-style` enumerate CSS селекторы

- **Owner:** `owner-web-style`.
- **Steps:**
  1. `packages/web/style/src/index.css` — расширить блок `.vt-route-content`:
     ```css
     /* Per-depth animations — enumerated, pattern-glob is not cross-browser stable */
     ::view-transition-old(capsule-content-0), ::view-transition-new(capsule-content-0) {
       animation-duration: 200ms;
     }
     /* repeat for 1/2/3 */
     ::view-transition-group(capsule-content-0), ... { animation-duration: 0; }

     /* Legacy fallback (single-Outlet consumers pre-CapsuleOutlet) */
     ::view-transition-old(capsule-content), ::view-transition-new(capsule-content) { ... }
     ```
  2. OWNERSHIP.md — отметить в «Публичный API» или Quirks что depth-enumerated 0..3 + fallback.
- **PR:** `feat(web-style): enumerate vt-name selectors for capsule-content-{0..3} (adr 046)`.
- **CI:** standard.
- **Blocks:** Phase C closes.
- **Status:** PENDING.

---

## Phase D — Zone migration (per ADR 047)

> Цель: `packages/web/*` физически разбит на 5 директорий-зон (kit / runtime / domain / boost / studio); domain-isolation compliance включён; vendor stack секции в OWNERSHIP; studio rename из web-creator. Post-D6: `design-time` zone retired в пользу top-level `studio/`.

⚠️ **Перед началом Phase D** — стабилизировать Phase B + C (мерджи приземлены, дерево чистое от переездов). Перемещение moving target = dirty.

### D1 — Physical directory layout {#D1}

- **Owner:** main steward (один большой coordinator-PR).
- **Steps:**
  1. Создать поддиректории: `packages/web/kit/`, `packages/web/runtime/`, `packages/web/domain/`, `packages/web/boost/`, `packages/web/studio/` (post-D6 — без `design-time/` parent).
  2. Move (git mv) каждого пакета в свою зону per [[047]] D1 table.
  3. `tsconfig.base.json` paths — обновить под новые директории; npm-имена сохраняются (`@capsuletech/web-ui` остаётся, путь меняется).
  4. `nx.json` — обновить `workspaceLayout` если нужно (вряд ли — `packages/**` уже покрывает рекурсивно).
  5. Vite-builder configs пакетов — если конфиг ссылается на относительный путь parent, обновить.
  6. `pnpm install` → lockfile минимально изменится (только paths).
  7. Compliance — `packages/builders/compliance/` зона-rule (D2 enforcement) добавляется в **отдельной PR (D3)**.
- **PR:** `refactor(packages): zone-grouped directory layout (adr 047 D1)`.
- **CI:** standard; build/typecheck/test green как до перемещения.
- **Status:** PENDING.

### D2 — Domain isolation contracts setup {#D2}

- **Owner:** main steward + owner-web-contract.
- **Steps:**
  1. Если cross-domain контракт нужен (см. реальный кейс в shell ↔ auth):
     - Извлечь types/interfaces в `packages/web/runtime/contract/src/<domain>.ts` (например `auth.ts`).
     - `web-shell` импортит контракт, `web-auth` реализует.
  2. Если cross-domain контракта НЕТ сейчас — D2 ограничивается **compliance-rule setup** в D3, без physical changes.
- **PR:** `feat(web-contract): cross-domain capability contracts (adr 047 D2)` (если нужен).
- **Status:** PENDING (зависит от реальной потребности).

### D3 — Compliance extension: domain-isolation + vendor-wrapper-comment {#D3}

- **Owner:** owner-builders (за `packages/builders/compliance/`).
- **Steps:**
  1. Compliance AST-rule: import path `@capsuletech/web-<domain-X>` из package `@capsuletech/web-<domain-Y>` (где X ≠ Y, оба в domain зоне) — warning.
  2. AST-rule: `Proxy(...)` / wrapper-creation вокруг известного vendor-importa без рядом расположенного комментария `// see ADR XXX` — warning.
  3. Compliance allowlist (для known-good обёрток типа UiProxy) — конфиг.
- **PR:** `feat(compliance): zone-canon + vendor-wrapper rules (adr 047 D2/D3)`.
- **Status:** PENDING.

### D4 — `web-creator` → `studio` rename + ui-creator absorb {#D4}

- **Owners:** owner-web-creator (rename), owner-web-ui-creator (absorb), main steward (coordinator).
- **Steps:**
  1. `packages/web/web-creator/` → `packages/web/studio/` (move; D6 collapsed `design-time/` parent).
  2. `package.json` name `@capsuletech/web-creator` → `@capsuletech/studio`.
  3. `tsconfig.base.json` paths — `@capsuletech/studio` + alias-period `@capsuletech/web-creator` (опционально).
  4. Поглощение `web-ui-creator` — move кода в `studio/src/{manifests, state, inspector, generators}/` под subpath'ы.
  5. `packages/web/web-ui-creator/` удаляется + npm-deprecate.
  6. Consumers (apps, downstream) — миграция import'ов (otдельный sweep, либо piggyback по апам в Phase B3 паттерне).
- **PR(s):** `refactor(studio): rename from web-creator + absorb web-ui-creator (adr 045 #2, adr 047 D4)`.
- **Status:** PENDING.

### D5 — OWNERSHIP «Vendor stack» секция (audit pass) {#D5}

- **Owners:** все owner-агенты + main steward координация.
- **Steps:**
  1. Каждый owner-X добавляет секцию «Vendor stack» в OWNERSHIP.md своего пакета (per ADR 047 D3 шаблон).
  2. Ownership canon gate (CI) — расширяется требованием секции.
- **PR(s):** per-package PR'ы либо bulk-sweep one-PR (главный coordinator).
- **Status:** **DONE** (closed 2026-06-13 via W2 #303 bulk sweep + D5 audit pass). All 23 packages have populated `## Vendor stack (ADR 047 D3)` section with real content (vendor names + version pins + peerDep/dep flags + upstream URLs). Leaf packages (renderer, contract, dnd, remote) explicitly state "no additional vendors by design". Scaffold packages (intl) mark TBD with rationale (e.g. ICU lib selection pending). No no-content placeholders remaining.

---

## Phase E — Docs infrastructure (per ADR 048)

> Цель: docs/**/*.md остаются source-of-truth; build-time extraction → typed registry; JSX-консумерс через @capsuletech/studio/docs; CI drift-guards.

Phase E **параллельна** Phase D (разные зоны кода).

### E1 — `docs/_build/extract.mjs` + `pnpm docs:build`

- **Owner:** main steward или owner-builders.
- **Steps:**
  1. Создать `docs/_build/extract.mjs` — unified/remark pipeline. Парсит frontmatter + `{#id}` heading-extension + `<!-- audience: X -->` блоки + `[[wikilinks]]`.
  2. Эмитит `docs/.generated/registry.ts` per ADR 048 D4 shape.
  3. Root `package.json` script: `"docs:build": "node docs/_build/extract.mjs"`.
  4. `docs/.generated/` в `.gitignore` (registry generated artifact).
  5. CI job: `pnpm docs:build` — falls если drift.
- **PR:** `feat(docs): build-time extraction pipeline + typed registry (adr 048)`.
- **Status:** PENDING.

### E2 — Section-ID inventory pass

- **Owner:** main steward.
- **Steps:**
  1. Пройти по `docs/01-architecture/adr/*.md`, добавить `{#id}` к Decision-секциям + Roll-out + Open questions. ADR 046/047/048 (новые) — уже имеют id pattern (но не явно `{#id}`; добавить).
  2. По мере касания других docs — touch-once.
- **PR:** `chore(docs): section-id inventory pass for ADR series (adr 048 E2)`.
- **Status:** PENDING.

### E3 — Audience-tagging (touch-once)

- **Owner:** distributed (туч-when-touch).
- **Steps:** при правке любой доки contributors добавляют `<!-- audience: ... -->` теги где есть аудитор-разница. Не bulk-PR.
- **Status:** ONGOING.

### E4 — `@capsuletech/studio/docs` consumer

- **Owner:** owner-studio (post D4 rename).
- **Steps:**
  1. `packages/web/studio/src/docs/` subpath: экспорт `DocSection`, `DocPage`, `useDoc` (per ADR 048 D5).
  2. Registry консумируется через статический import или динамический lazy-loader.
  3. Style — через web-style; рендеринг — через web-renderer (если markdown-rehype-render готов) или прямой rehype-stringify → Solid.
- **PR:** `feat(studio,docs): DocSection/DocPage consumer components (adr 048 D5)`.
- **Status:** PENDING.

### E5 — Apps consume

- **Owner:** main steward + page-агенты.
- **Steps:** apps/playground / future capsule-сайт показывают `<DocSection slug="adr/046#D1"/>` в правильных местах. Apps без consume — никаких изменений.
- **Status:** PENDING (low priority).

### E6 — CI drift-guards

- **Owner:** owner-builders или main steward.
- **Steps:**
  1. `pnpm docs:build` встроен в CI job. Job отдельный или включён в Test.
  2. Сбой при broken wikilink / id-collision / unclosed audience-tag / renamed-id-without-alias.
- **PR:** `ci(docs): drift-guards for section-id + wikilink + audience-tags (adr 048 D6)`.
- **Status:** PENDING.

---

## Phase W / B / C / D / E parallelism map

```
A0 (merge 046+047+048+plan) ─→ A1 (USER creates owner-boost-matrix + restart) ─┐
                                                                                │
              ┌─────────────────────────────────────────────────────────────────┘
              │
              ├─────────────────────────────┬───────────────────────────────┐
              ▼                             ▼                               ▼
┌────────────────────────────┐ ┌──────────────────────────┐  ┌────────────────────────────┐
│ Phase W (web-space canon)  │ │ Phase B (boost sweep)    │  │ Phase C (vt-rework)        │
│ W1 zone canon docs ✅      │ │ B1 boost-matrix scaffold │  │ C1 CapsuleOutlet+DepthCtx ✅│
│ W2 OWNERSHIP+README ✅     │ │ B2 web-shell strip       │  │ C2 Ui.Outlet swap ✅       │
│ W3 L0/L1 gradient ✅       │ │ B3 apps imports          │  │ C3 CSS enumerate ← READY   │
│ W4 manifest infra ← READY  │ │ B4-B7 → ABSORBED W6 ✅   │  │                            │
│ W5 cross-import ← READY    │ │ B6-placeholder ← READY   │  │                            │
│ W6 boost-* renames ✅      │ │                          │  │                            │
│ W7 plan-doc update ✅      │ │                          │  │                            │
└────────────────────────────┘ └──────────────────────────┘  └────────────────────────────┘
                                          │
                                          ▼ (after W+B+C stabilize)
              ┌────────────────────────────────┐   ┌────────────────────────────────┐
              │ Phase D (zone migration)       │ ║ │ Phase E (docs infra)           │
              │ D1 directory layout            │ ║ │ E1 extract.mjs + pnpm docs:build│
              │ D2 contracts setup (if needed) │ ║ │ E2 section-id inventory        │
              │ D3 compliance extension        │ ║ │ E3 audience-tagging (ongoing)  │
              │ D4 studio rename + absorb      │ ║ │ E4 studio/docs consumer        │
              │ D5 OWNERSHIP Vendor stack      │ ║ │ E5 apps consume                │
              │                                │ ║ │ E6 CI drift-guards             │
              └────────────────────────────────┘   └────────────────────────────────┘
```

- **A0 → A1** sequential (ADR merge first; agent setup after).
- **Phase W ‖ Phase B ‖ Phase C** parallel — main steward (W) + boost-matrix track (B1-B3) + router track (C). Разные пакеты, разные owners.
- **B4-B7 absorbed → W6** (mechanical renames в одном atomic PR'е main steward'а; Ui.* placeholder'ы — отдельный PR owner-web-ui).
- **Phase W+B+C → D/E** sequential (D перемещает пакеты; делать пока W/B/C ещё в полёте = moving target).
- **Phase D ‖ Phase E** parallel — D трогает packages/web/* layout, E трогает docs/ + build pipeline. Не пересекаются.

## Dispatch sequence — какого owner'а когда вызывать

| Шаг | Что | Кому | Как |
|---|---|---|---|
| 1 | A0 — ADR 046+047+048 + plan-doc merge | main steward пишет, USER review + dispatches owner-git | Один scope-PR `docs: 3-adr triada + rework plan` (**DONE** #300) |
| 2 | A1 — owner-boost-matrix .claude/agents/ file | USER | Создаёт файл вручную (main steward drafts skeleton), **restart session** (USER в процессе) |
| 3 | W1+W3+W7 — zone canon docs + L0/L1 + plan-doc update | main steward | Один docs-PR, **DONE** 2026-06-11 (этот PR-bundle) |
| 4a | W2 — OWNERSHIP refresh + README per-package | main steward | Один coordinator-PR, после W1 |
| 4b | W5 — cross-import inventory baseline | main steward | Либо в W2 PR-bundle, либо отдельный |
| 4c | W6 — boost-* renames (B4-B7 absorbed) | main steward | Один atomic PR, mechanical, параллельно W2 |
| 4d | C1 — CapsuleOutlet | owner-web-router | Foreground (USER dispatches per brief), параллельно W |
| 5a | B1 — boost-matrix scaffold | main steward | После A1 + W1 готовности canon'а; не делегирует |
| 5b | C2 — Ui.Outlet swap + playground patch | main steward | После C1; cross-package PR (web-core + playground) |
| 6a | B2 — web-shell strip | owner-web-shell | После B1; coordinated с owner-boost-matrix |
| 6b | C3 — CSS селекторы | owner-web-style | После C2 |
| 6c | W4 — bundle-size + manifest infra | owner-web-ui | После W3 → готов; параллельно с B/C |
| 6d | B6-placeholder — Ui.Map/Flow/Chart placeholders | owner-web-ui | После W6 merge (boost-* renames первыми) |
| 7 | B3 — apps imports (Matrix) | main steward / page-агенты | После B2 |
| 8 | A2 — rename owner-web-{table,map,flow,charts} → owner-boost-* (опц.) | main steward + USER restart | После W6 merge; отдельный PR; **OPTIONAL** |
| 9 | Cleanup | main steward | Verify, update plan-doc status |

## Live status

| Phase | Status | PR | Notes |
|---|---|---|---|
| A0 — ADR 046+047+048 + plan-doc merge | **DONE** | #300 | Triada merged 2026-06-11 |
| A1 — owner-boost-matrix agent + restart | IN PROGRESS (USER) | — | `.draft → .md` rename + session restart на стороне USER'а |
| A2 — rename owner-web-{table,map,flow,charts} → owner-boost-* | **DONE** | этот PR | rename 2 existing agent files (table+map; flow+charts не существовали) + sed internal refs в docs/_meta + agent name fields. **Restart required** для активации в registry |
| W1 — Zone canon docs (kit/runtime/domain/boost/studio + index) | **DONE** | #302 + this PR | `docs/_meta/web-zones/*.md` (post-D6 zone rename) |
| D6 — Studio zone flatten (`design-time/studio` → top-level `studio/`) | **DONE** | this PR | folder + tsconfig + compliance + docs + agent rename context. Reason: `design-time` зона имела sole inhabitant и читалась как «UI/styling stuff»; studio = host/composer top-level зона. ADR 047 amend D6. |
| W2 — OWNERSHIP refresh + README per-package | **DONE** | #303 | 23 OWNERSHIP refresh + 11 new README + readme-template; зафиксирован `web-access → web-auth` drift |
| W3 — L0/L1 gradient + manifest schema | **DONE** | #302 | `docs/_meta/web-ui.md` секция |
| W4 — Bundle-size + manifest infra (owner-web-ui) | READY | — | После W3 → готов; USER dispatches owner-web-ui |
| W5 — Cross-import inventory baseline | **DONE** | этот PR | `docs/_meta/web-audit-cross-imports.md` — 23 пакета snapshot; единственный drift `web-access → web-auth` (runtime → domain), закрывается Phase D2 |
| W6 — Boost-renames `web-*` → `boost-*` (B4-B7 absorbed) | **DONE** | #306 | 4 пакета renamed, tsconfig aliases для grace, lockfile sync, build clean |
| W7 — Plan-doc update | **DONE** | #302 (initial) + этот PR (post-W6+C1+C2) | live status refresh |
| B1 — boost-layout scaffold ⚠ amend | READY | — | После D1 ✅ + ADR 046 amend merge; main steward executes |
| B2 — web-shell strip Matrix → boost-layout | BLOCKED | — | Wait B1 |
| B3 — apps imports → Ui.Layout.Matrix | BLOCKED | — | Wait B2 |
| B4-B5 — boost-* renames (table/map/flow) | **ABSORBED** → W6 (#306) | — | — |
| B5b — boost-charts → boost-chart singular ⚠ amend | PENDING | — | Bundle с PR-B (rename + B6 namespace) |
| B6-placeholder — Ui.MapView/FlowDiagram/Chart restructure → namespace form ⚠ amend | PENDING | — | Bundle с PR-B (renames + agent rename) |
| C1 — CapsuleOutlet + DepthContext | **DONE** | #304 | owner-web-router; 9 файлов; 9+4 tests jsdom; vt-name per-depth |
| C2 — Ui.Outlet swap | **DONE** | #305 | main steward; `Outlet` injection в Page+Widget wrappers переключён на CapsuleOutlet (alias-import). Apps/playground outlet patch — USER в своей ветке. |
| C3 — CSS селекторы enumerate | READY | — | После C2 merge (✅) — USER dispatches owner-web-style |
| D1 — Zone directory layout | BLOCKED | — | Wait W+B+C stable |
| D2 — Cross-domain contracts (web-access drift fix) | **DONE** | этот PR | `IAuthCapability` в `web-contract/capabilities`; web-access потребляет контракт; vite-builder generator wires `useAuth()` arg. W5 known drift закрыт. |
| D3 — Compliance extension (zone canon enforcement) | **DONE** | этот PR | `zones.ts` + `runZoneCheck` + `cross-zone-import` violation kind. 44 new tests. Sanity sweep 557 web/* files = 0 violations. Vendor-wrapper-comment rule deferred (separate ADR if needed). |
| D4 — studio rename + absorb ui-creator | **DONE** | #334 | `git mv ui-creator → studio` (preserves code history), npm `web-ui-creator` → `studio`, drop empty creator skeleton, 6 apps + tsconfig + nx + vite-builder + compliance + CLI templates updated, `owner-web-ui-creator` agent renamed to `owner-studio`. Restart required for agent. |
| D5 — OWNERSHIP Vendor stack audit | **DONE** | this PR | Closed via W2 #303 thorough bulk sweep + 2026-06-13 audit pass. All 23 packages have populated `## Vendor stack` section with vendor names + version pins + flags + upstream URLs. Leaf packages explicitly note "no additional vendors". Scaffold packages mark TBD with rationale. No content gaps. |
| D6 — Studio zone flatten (`design-time/studio` → top-level `studio/`) | **DONE** | #335 | ADR 047 amendment D6. `git mv` preserves history. compliance/tsconfig/zone-canon docs/agent context all updated. Reason: `design-time` name misleading + sole-inhabitant collapse. |
| E1 — docs:build extract pipeline | **DONE** | #336 | `docs/_meta/docs-system.md` canon + `docs/_build/extract.mjs` (zero-dep line-based parser, code-fence + inline-code aware) + `pnpm docs:build` + `docs/.generated/` ignored. 170 docs / 2027 sections / ~125ms. CP1 contract agreed with user upfront. |
| E2.1 — section-id pass on ADRs | **DONE** | #337 | `docs/_build/retrofit-ids.mjs` idempotent script. 246 retrofits (225 H2 + 21 H3) across 46 of 47 ADRs. 0 collisions. Warnings: 2419 → 2173 (-246). |
| E2.2 — section-id pass on canon docs + AI-anchors + 09-packages | **DONE** | #338 | Extended script with web-zones + AI-anchor + OWNERSHIP/README template H2 mappings. 159 retrofits across 46 files. Warnings: 2173 → 2014 (-159). Cumulative: -405 / -16.7%. |
| E2.3 — emoji-prefixed headings in briefs/anti-patterns | PENDING (low priority) | — | Touch-when-touch; wild structure |
| E2.4 — document-specific non-canonical headings | PENDING (touch-when-touch) | — | Per-doc decisions |
| E3 — Status enum normalization + audience tagging | PARTIAL (audience ongoing; status pending) | — | 81 docs use non-canon status (accepted/implemented/living/snapshot). Needs mapping decision: `accepted/implemented → canon`, `planned/draft → proposed`, `living/snapshot/live → documented`. Audience-tagging touch-when-touch (no PR-driven). |
| E4 — studio/docs consumer | PENDING | — | Can start; needs `<DocSection>` shape design proposal |
| E5 — apps consume DocSection | BLOCKED | — | Wait E4; low priority |
| E6 — CI drift-guards | **DONE** | #339 | Standalone `Docs build (ADR 048 E6)` job in `.github/workflows/ci.yml`. Zero-dep (no pnpm install), runs `node docs/_build/extract.mjs`. Fails on errors, passes on warnings. Will escalate to strict mode post-E2.4. |

## Studio internal audit (post-D5, 2026-06-13)

> User-approved CP outcomes (2026-06-13): A (`packages/web/runtime/data-gen/`) + B3 (unified `IPrimitiveManifestEntry` in web-ui kit) + S1-first sequencing. Composition rule canon applied: studio = host/composer, raw engines + manifests live where they functionally belong.

| Phase | Status | PR | Notes |
|---|---|---|---|
| S1 — Extract `/generators` to `@capsuletech/data-gen` | **DONE** | #342 | New runtime package (no `web-` prefix). Tree shape (`IEditorTree`/`IEditorNode`/`NodeId`) owned in data-gen (single source of truth). Engine decoupled from studio via optional `IManifestResolver`. Templates stay in studio (composition product-block). Compliance NO_PREFIX_PKG_DIRS set added. 39 tests in data-gen + 187 in studio. |
| S2 — Consolidate `/manifests` in web-ui kit | **DONE** | #343 | 14 hand-authored manifests moved studio → web-ui (git-rename detected). Schema `IPrimitiveManifestEntry` extended to cover identity + UI + inspector + DnD + bundle-cost. New subpath `@capsuletech/web-ui/manifest`. Studio's `/manifests` subpath thin re-export + studio-specific `rules.ts` stays. `ComponentCategory` moved to web-ui. `IComponentManifest` retained as `@deprecated` alias. |
| S2 follow-up — W4 part 2 (build-manifest merge) | PENDING | — | `scripts/build-manifest.mjs` extends to merge hand-authored data with auto-gen bundle-cost into single `dist/manifest.json`. Today: auto-gen-only; hand-authored fields read directly from subpath. |
| S3 — `/state` rename to `/tree` (optional) | DEFERRED | — | Cosmetic — better signal but more churn |
| S4 — `/inspector` rename to `/inspector-panel` (optional) | DEFERRED | — | Composition rule canon — subpath = product name. Cosmetic. |

## Constraints / гарды

- Parallel WIP в working tree сохраняется (29 files). Каждый owner-агент брифится по своему пути; никогда `git add -A` / `git restore`.
- Lockfile churn — координируется через main steward: если несколько B-renames запускаются одновременно, каждый делает свой `pnpm install` локально; конфликты на pull resolve'им через one-file `stash push/pop` pattern (документировано в session памяти).
- view-transition CSS обратной совместимости: пока C3 не merge'нут, после C1+C2 routing-animation **может** degrade'нуть для несконсолидированных консьюмеров (fallback `capsule-content` без depth). C3 закрывает.
- `Ui.Matrix` в web-ui НЕ добавляется — landing case покрывается `Ui.Grid`. Если позже понадобится lighter-than-Grid Matrix-shape — отдельный ADR.

## Открытые вопросы {#open-questions}

- **B2 cooperate-PR** ИЛИ два последовательных? Решение — main steward на момент B1 готовности (по диффу).
- **A2 rename агентов** — делать или нет? Решение — user, после A0.
- **boost-* публикация** — Verdaccio test-publish'и нужны? Если да — Phase B6/B7 включают release-local rehearsal. Если нет — отложено до релиза.
- **TanStack Outlet + DepthContext lifetime** — CapsuleOutlet рисует Outlet внутри Provider. DepthContext Solid-store, реактивно корректен. Возможно edge-case если TanStack remounts Outlet — owner-web-router проверит при импле C1.

## История изменений {#changelog}

- 2026-06-13 — **Studio audit S1+S2 DONE**: (S1) `@capsuletech/data-gen` extracted from studio (engine + presets + RNG + fuzzer + tree types as single source); (S2) per-primitive manifests unified in `@capsuletech/web-ui` kit via subpath `/manifest` — `IPrimitiveManifestEntry` covers identity + UI + inspector + DnD + bundle-cost. Studio remains thin host/composer. PRs #342, #343.
- 2026-06-13 — **E3 DONE** (#341): status enum normalization (57 docs rewritten to canon enum) + 2 transient deletions (routing-anim-findings + finish-review-notes — author-intent-to-delete satisfied).
- 2026-06-13 — **D5 DONE + plan-doc refresh** (#340): W2 OWNERSHIP audit verified — all 23 packages have populated vendor stack. Live status table refreshed for session.
- 2026-06-13 — **E6 DONE** (#339): standalone CI job `Docs build (ADR 048 E6)` — zero-dep, ~30s, fails on errors.
- 2026-06-13 — **E2.2 DONE** (#338): section-id retrofit canon docs + AI-anchors + 09-packages (159 retrofits).
- 2026-06-13 — **E2.1 DONE** (#337): section-id retrofit ADR series (246 retrofits — 225 H2 + 21 H3).
- 2026-06-13 — **E1 DONE** (#336): docs-as-data extract pipeline + canon (170 docs / 2027 sections / 0 errors).
- 2026-06-12 — **D6 DONE** (#335): `design-time` zone retired, replaced by top-level `studio/` (5-я zone, host/composer). `git mv` preserved code history. tsconfig/compliance/zone-canon docs/agent context — all updated. ADR 047 amend D6. Reason: zone name «design-time» misleading (читалось как «UI/styling»), studio sole inhabitant — collapse в top-level zone.
- 2026-06-12 — **D1 5/5 DONE** (PR #323-#327, kit/design-time/boost/domain/runtime) → `packages/web/` = 5 zone-папок per ADR 047 D1.
- 2026-06-12 — **ADR 046 amended**: augmentation pattern (Decision 5 added). Renames: `boost-matrix` → `boost-layout`, `boost-charts` → `boost-chart`. Kit placeholder'ы реструктурируются под namespace-form (`Ui.Map.View` instead of `Ui.MapView`). Reason: разные «уровни tier'а» одной фичи (light kit + heavy boost) должны делить один user-facing API path (`Ui.<Element>.*`), а не два параллельных namespace'а (`Ui.Map` + `Maps.*`). Rationale — это и есть «booster»: boost конкретного kit-элемента.
- 2026-06-11 — создан, status pending.
- 2026-06-11 (late) — **Phase W вставлена** (web-space canon на main steward'е): W1 zone canon docs + W3 L0/L1 gradient + W7 plan-doc update — все DONE этим PR-bundle'ом. B4-B7 boost-renames absorbed в W6 (mechanical, один atomic PR vs четыре per-owner). W2 OWNERSHIP+README, W4 manifest infra (owner-web-ui), W5 cross-import baseline, W6 renames — PENDING. Workflow rationale: USER указал «web-space на тебя — canon+порядок, не функционал; renames в одном стиле»; параллелизм с C1 (owner-web-router уже dispatched).
- 2026-06-11 (night) — **5 PR'ов merged каскадом** в main:
  - #302 (`46d349e`) — W1+W3+W7 zone canon + L0/L1 + plan-doc.
  - #303 (`6972e3b`) — W2 OWNERSHIP+README sweep (23 пакета + 11 new README + template); зафиксирован `web-access → web-auth` runtime→domain drift (закрывается в Phase D2).
  - #304 (`a2b93f0`) — C1 CapsuleOutlet + DepthContext + useRouteDepth rewrite (owner-web-router work).
  - #305 (`2959f05`) — C2 `Ui.Outlet` swap в Page+Widget wrappers через CapsuleOutlet alias.
  - #306 (`60ec8b1`) — W6 boost-* renames atomic (4 пакета + 28 файлов + tsconfig aliases для grace).
  Phase W полностью завершена (W1-W7 DONE кроме W4/W5 которые ждут dispatch'а). Phase C1+C2 DONE. **Готовы к dispatch'у:** owner-web-style (C3), owner-web-ui (W4 manifest + B6-placeholder), opt. main steward (W5 baseline) и (A2 agent renames).
