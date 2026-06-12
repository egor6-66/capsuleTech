---
tags: [hca, adr, proposed, packages, boundary, routing, layout, augmentation]
status: proposed
date: 2026-06-11
amended: 2026-06-12
supersedes_partial: 045
---

> [!info] Status
> **Proposed** — 2026-06-11. **Amended 2026-06-12** — boost-namespace переоформлен из «parallel registry» в **augmentation pattern**: boost-пакет расширяет kit-namespace (Ui.Layout, Ui.Map, …), а не вводит свой собственный (Matrices, Maps, …). Renames: `boost-matrix → boost-layout`, `boost-charts → boost-chart` (singular для консистентности). См. Decision 5 ниже.
>
> Архитектурный документ; **исполнение** — в живом плане [`docs/_meta/web-rework-plan.md`](../../_meta/web-rework-plan.md) (отдельная дока, мутируется по мере мерджа PR'ов).
>
> **Sister-ADR'ы (ландят одной волной):** [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] (zones / cycle canon / vendor transparency / studio rename — крыша) + [[048-docs-as-data|ADR 048]] (docs infrastructure).
>
> **Частично supersedes [[045-web-taxonomy]] #1** — расщепление `web-shell` на `/layout` + `/chrome` отзывается: Matrix эвакуируется из shell целиком (см. Decision 2 ниже). #2 (creator absorb ui-creator) и #3 (depth-scoped vt-name) остаются valid; #3 уточняется реализацией (см. Decision 4).
>
> Связано: [[045-web-taxonomy]], [[029-widget-frame-chrome]] (frame=chrome), [[033-package-registration]] (manifest), [[044-web-menu-package]] (граница heavy=pkg / light=kit-композиция).

# ADR 046 — Boost-* package namespace + Matrix evict from web-shell + CapsuleOutlet owns vt-name

## Контекст

Четыре проблемы всплыли при попытке закрыть Phase 0 ADR 045 #3 (`depth-scoped vt-name`):

### Problem 1 — нет имени для booster-пакетов

`@capsuletech/web-table`, `web-map`, `web-flow`, `web-charts` — все они **heavy-domain** пакеты которые **бустят lightweight kit-примитив до полной мощи** (web-table бустит `Ui.Table`, web-map бустит будущий `Ui.Map`, и т.д.). Но название `@capsuletech/web-X` это не сообщает — выглядит как «ещё один web-* пакет». Owner-агенты, новые контрибьюторы и потенциальные внешние юзеры не различают «light primitive в web-ui» vs «full booster».

ADR 044 ввёл правило границы (heavy=отдельный пакет, light=композиция в web-ui), но имя для heavy-пакетов осталось aspecific.

### Problem 2 — Matrix живёт не там

`packages/web/shell/src/matrix/` — Matrix grid с resize/DnD/persistence. Исторически появилась как обвязка app-shell (ADR 026), но **архитектурно это general layout primitive** для любого widget/page, не shell-specific. Studio editor использует Matrix без shell'а; landing-сценарии могут хотеть Matrix без всего web-shell куста (или vice versa).

ADR 045 #1 зафиксировал `web-shell = /layout (Matrix) + /chrome (Header...)`. Это было **ошибкой** — layout (Matrix) не parallel ярус к chrome, а **отдельная домен-зона**, которая случайно жила в shell.

### Problem 3 — нет light-версии Map (и similar пробелы)

ADR 044 утверждает: «light = композиция в web-ui». Но для Map, Flow, и потенциально других heavy-пакетов **в web-ui сейчас нет даже placeholder'а**. Кейс: landing-страница хочет показать карту-картинку без всей мощи MapLibre — нет примитива → консьюмер либо тянет boost-map (overkill), либо лепит native-DOM (антипаттерн web-ui-coverage).

Pattern должен быть: каждый booster-пакет ИМЕЕТ light-counterpart в web-ui, даже если это placeholder-примитив. Иначе perspective-bug при следующем «но я хочу простой X».

(Matrix исключение — light-версия = существующий `Ui.Grid`, новый примитив не нужен. Table исключение — `Ui.Table` уже есть.)

### Problem 4 — vt-name принадлежит не там и реализован неверно

PR #298 ввёл `useRouteDepth()` через `useMatches().length - 1`. **Семантически broken** для вложенных layout'ов:
- `/workspace/web-studio/design` → matches.length = 4 → hook возвращает 3 **на каждом уровне Outlet'а**.
- Каждый `Shell.Matrix` получает один и тот же depth → vt-name = `capsule-content-3` коллизия не ушла, переименована.

Корректная форма — **per-Outlet `DepthContext.Provider`** через wrapper `<CapsuleOutlet/>`, который инкрементит depth относительно родителя.

Дополнительно: shell вообще не должен звать routing-hook. Sub-навигационная анимация = забота **Outlet'а** (он рисует свой animation-frame), окружающий layout (Matrix или любой другой) нейтрален.

## Решения

### Decision 1 — Booster-package namespace = `@capsuletech/boost-<kit-element>`

Каждый heavy-domain пакет получает имя `@capsuletech/boost-<kit-element>` — где `<kit-element>` это **имя расширяемого kit-namespace** (`Ui.Layout`, `Ui.Map`, …), а не имя конкретной реализации. Booster = «boost конкретного kit-элемента». Renames:

| Сейчас | Становится | Расширяет |
|---|---|---|
| `@capsuletech/web-table` | `@capsuletech/boost-table` | `Ui.Table` |
| `@capsuletech/web-map` | `@capsuletech/boost-map` | `Ui.Map` |
| `@capsuletech/web-flow` | `@capsuletech/boost-flow` | `Ui.Flow` |
| `@capsuletech/web-charts` | `@capsuletech/boost-chart` ⚠ | `Ui.Chart` |
| *(new)* | `@capsuletech/boost-layout` ⚠ | `Ui.Layout` |

⚠ **Amendment 2026-06-12:**
- `boost-charts` → `boost-chart` (singular) для консистентности с расширяемым namespace `Ui.Chart`.
- `boost-matrix` (планировался) → `boost-layout` — Matrix это конкретный layout-вариант (рядом с Flex / Grid), а не отдельный namespace. Пакет расширяет `Ui.Layout.{Flex, Grid}` добавлением `Matrix`. См. Decision 5.

`@capsuletech/web-*` namespace остаётся для:
- **kit:** `web-ui` (light primitives + light composites)
- **runtime / framework:** `web-core`, `web-state`, `web-router`, `web-style`, `web-renderer`, `web-query`, `web-dnd`, `web-intl`, `web-date`, `web-profiler`, `web-remote`, `web-access`, `web-contract`
- **domain (стейтфул, не booster):** `web-auth`, `web-shell`, `web-agent`
- **design-time:** `web-creator` (поглощает `web-ui-creator` per ADR 045 #2)

Различие **booster vs domain**: booster расширяет существующий kit-namespace (`Ui.<X>` += booster-варианты); domain — самостоятельная стейтфулная фича без kit-mirror (auth — нет «light auth»; shell chrome — отдельная категория).

**Канон зависимости:** `boost-<X>` зависит от `web-ui` (kit-namespace `Ui.<X>` который расширяет) + heavy движка (tanstack-table/maplibre/babylon/…). Обратной зависимости НЕТ (web-ui не знает про boost-*).

### Decision 2 — Matrix эвакуируется из web-shell → `@capsuletech/boost-layout`

`packages/web/shell/src/matrix/` целиком переезжает в **new package** `packages/web/boost/layout/` (после Phase D1 directory layout — см. ADR 047).

- `web-shell` остаётся **только chrome**: Header, ModeToggle, Appearance, FinishSettings, Account, будущие Sidebar/Footer/CommandBar. Subpath'ы `/layout` и `/matrix` (внедрённые в PR #295) **удаляются**.
- `@capsuletech/boost-layout` — новый booster-пакет per Decision 1. Содержит resize/DnD/persistence Matrix, presets (`app-shell`, `studio`, …). **Matrix — конкретная реализация внутри пакета**; пакет может в будущем добавить другие heavy-layout варианты (Masonry, Bento, Dock, …) — все они станут членами `Ui.Layout.*` per Decision 5.
- **Kit-counterpart**: `Ui.Layout = { Flex, Grid }` уже существует в `web-ui`. boost-layout **расширяет** namespace до `Ui.Layout = { Flex, Grid, Matrix }` через augmentation pattern (Decision 5). Light-замена для Matrix не нужна — consumer использует `Ui.Layout.Grid` если хочет static-layout без resize/DnD.

Consumers до сих пор импортили `Shell.Matrix` (через web-shell):
- App подключил boost-layout → `Ui.Layout.Matrix` доступен через стандартный kit-namespace (один API path).
- App без boost-layout → `Ui.Layout.Grid` или `Ui.Layout.Flex`.
- Дополнительно: программный API через ADR 033 capability (`Layouts.Matrix.*`) — для controllers/features, не для UI consumer'ов.

ADR 045 #1 (shell=layout+chrome split) — **superseded**. `web-shell/src/layout/` и `web-shell/src/chrome/` subpath'ы из PR #295: `/chrome` остаётся (chrome — это всё что в shell живёт); `/layout` удаляется. `/matrix` (был deprecated alias) удаляется.

### Decision 3 — Kit-namespace всегда заведён, boost-пакет расширяет

Каждый booster-пакет ОБЯЗАН иметь соответствующий **kit-namespace** в `web-ui` с **хотя бы одним базовым членом**. Это базовая light-форма; boost-пакет затем расширяет namespace через augmentation (Decision 5).

| Booster | Kit namespace | Базовый член (kit) | Дополняется boost'ом (примеры) |
|---|---|---|---|
| `boost-layout` | `Ui.Layout` | `Flex`, `Grid` (уже есть) | `Matrix` (resize+DnD), будущие Bento/Dock |
| `boost-table` | `Ui.Table` | basic `Table` parts (уже есть) | `DataTable`, `Infinite`, `Virtual` |
| `boost-map` | `Ui.Map` | `View` (placeholder, 2D static) | `3D`, `2.5D`, `Globe` |
| `boost-flow` | `Ui.Flow` | `Diagram` (placeholder, static svg) | `Reactive`, `Editor` |
| `boost-chart` | `Ui.Chart` | basic `Chart` (placeholder, single-series) | `Line`, `Bar`, `Pie`, `Heatmap` |

Базовый kit-член (например `Ui.Map.View`):
- семантически-корректный DOM (`role=img`, `aria-label`)
- skeleton-стилизация или статическая svg/canvas
- data-state hooks (`data-state="placeholder"`)
- API-shape forward-compatible с heavy-членами того же namespace (так чтобы прокидываемые props сохранялись когда консьюмер свапает `Ui.Map.View` ↔ `Ui.Map.3D`)

Это **canon**: нельзя сделать heavy-booster без базового kit-namespace + хотя бы одного «light»-члена. Если placeholder невозможен — это не booster, а domain (как auth).

⚠ **Amendment 2026-06-12**: pre-amendment placeholder'ы в kit имели flat-имена (`Ui.MapView`, `Ui.FlowDiagram`, `Ui.Chart` single). Под augmentation-ready форму они реструктурируются в namespace'ы: `Ui.Map.View`, `Ui.Flow.Diagram`, `Ui.Chart.<basic>`. См. plan-doc Phase B6-rerun.

### Decision 4 — `CapsuleOutlet` владеет vt-name (web-router)

Vt-name (`view-transition-name: capsule-content-${depth}`) — **зона routing'а**, не layout'а.

- `@capsuletech/web-router` вводит `<CapsuleOutlet/>` — обёртка над TanStack `<Outlet/>` + `<DepthContext.Provider value={(parent ?? -1) + 1}>`. Это **publishable component**, заменит `Outlet` в `web-core/ui-kit/imports.tsx` (как `Ui.Outlet`).
- `useRouteDepth(): Accessor<number>` — переписывается на `useContext(DepthCtx)`. **Signature kept** (PR #298 контракт остаётся валидным); impl меняется.
- `CapsuleOutlet` сам ставит `view-transition-name: capsule-content-${depth()}` + class `vt-route-content` на свой wrapper-DOM.
- **Matrix больше не знает про vt-name.** Никаких useRouteDepth-вызовов в layout-коде. PR #299 (закрытый) подтверждает: Matrix-side попытка была архитектурно неверной.

Для CSS:
- `@capsuletech/web-style` глобальный класс `vt-route-content` enumerate-селекторы:
  ```css
  ::view-transition-old(capsule-content-0), ::view-transition-new(capsule-content-0) { /* fade */ }
  ::view-transition-old(capsule-content-1), ::view-transition-new(capsule-content-1) { /* fade */ }
  ::view-transition-old(capsule-content-2), ::view-transition-new(capsule-content-2) { /* fade */ }
  ::view-transition-old(capsule-content-3), ::view-transition-new(capsule-content-3) { /* fade */ }
  ::view-transition-group(capsule-content-*) { animation-duration: 0 }  /* group-morph suppress */
  ```
  Pattern-glob (`name-*`) в `::view-transition-*` не cross-browser стабильно (Chromium 126+ экспериментально). Enumerate 0..3 уровня покрывает реалистичный depth-набор; новые уровни добавляются явно.
- Single-Outlet legacy fallback: класс `vt-route-content` БЕЗ depth-суффикса остаётся для совместимости с консьюмерами, которые ещё не на CapsuleOutlet (бывший константный `capsule-content`).

PR #298 в main остаётся, contract сохраняется, impl переписывается в этом rework'е.

### Decision 5 — Augmentation pattern: boost-пакет расширяет kit-namespace

**Принцип:** один user-facing API path — `Ui.<Element>.*` — независимо от того, light это вариант (kit) или heavy (boost). Consumer не должен знать «откуда тянуть» — это вопрос только подключения пакета через `capsule.config.ts`.

**Runtime mechanics:**

1. Kit (`web-ui`) экспортирует базовый namespace:
   ```ts
   // packages/web/kit/ui/src/primitives/layout/index.ts
   export const Layout = { Flex, Grid };
   ```
2. App подключает boost-* через ADR 033 (`capsule.config.ts → entities/widgets/layouts/...`):
   ```ts
   // apps/<app>/capsule.config.ts
   import { defineCapsuleConfig } from '@capsuletech/vite-builder';
   import boostLayout from '@capsuletech/boost-layout/capsule';

   export default defineCapsuleConfig({
     boost: [boostLayout],  // регистрирует Matrix в Ui.Layout
   });
   ```
3. Boost-пакет имеет `capsule.ts` (ADR 033 manifest), который при init augment'ит `Ui.<Element>`:
   ```ts
   // packages/web/boost/layout/src/capsule.ts
   import { Matrix } from './matrix';
   export default {
     augments: 'Ui.Layout',
     contributions: { Matrix },
   } satisfies IBoostManifest;
   ```
4. `web-core` bootstrap (через vite-builder generator) выполняет `Object.assign(Ui.Layout, contributions)` при start.

**Type-level (TS module augmentation):**

Boost-пакет декларирует расширение типа базового namespace:
```ts
// packages/web/boost/layout/src/types.d.ts
declare module '@capsuletech/web-ui/layout' {
  interface ILayoutNamespace {
    Matrix: typeof Matrix;
  }
}
```
В app TS сразу видит `Ui.Layout.Matrix` после подключения boost-layout (нет «cast'ов» в consumer-коде).

**Tree-shake guarantee:**

App без подключения boost-* — `Matrix`/`3D`/`DataTable` НЕ попадают в bundle (kit зависит только на kit, boost не autoload'ится). Подключение через `capsule.config.ts` — явное opt-in.

**Параллельная программная ось (для controller/feature):**

ADR 033 registry `Layouts.*` / `Maps.*` / `Charts.*` (capability namespace) сохраняется для programmatic API в Controller/Feature слоях (где нужно «вызывать» capability как сервис, а не рендерить компонент). Это **другая ось** — UI consumer'ы используют `Ui.Layout.Matrix`, controller'ы могут использовать `Layouts.Matrix.create(...)` если такое API существует.

**Rejected:**
- «Parallel registry» (`Matrices.Resizable`, `Maps.OpenLayers`) как **UI-facing** API — два namespace'а для одной фичи, юзер должен знать что где. Augmentation = одна точка истины.
- Дублирование (kit имеет full implementation, boost just re-exports more heavy variant) — copy-paste, нет вertical split.

## Что НЕ решает ADR 046 (явно вне scope)

- Конкретный список placeholder-shape (Ui.Map / Ui.Flow / Ui.Chart) — решает owner-web-ui в момент добавления.
- Storybook sunset (планируется в Phase 0+1, ADR 045 #2 follow-up).
- view-transition-class (per-route variant/duration) — отложено в ADR 045 (как и было).
- Renames domain-пакетов в `@capsuletech/{table,map,…}` (drop `web-`) — отвергнуто (см. альтернативы).
- Per-app codegen update под новые import-пути — это plan-doc забота, не архитектура.

## Последствия

**+** Booster-namespace явный: owner-агент / контрибьютор / внешний юзер сразу видит «это booster над web-ui примитивом».
**+** web-shell сужается до своей реальной зоны (chrome) — меньше confusion, проще ownership.
**+** Routing-animation в своей зоне (CapsuleOutlet), Matrix очищается от cross-cutting `useRouteDepth`.
**+** Light всегда есть — consumer'у не нужно тянуть heavy-пакет ради «простого X».
**+** ADR 045 #1 corrected без отказа от всего ADR'а (соседние #2 #3 валидны).

**−** Renames boost-table/map/flow/charts требуют bump major-версий и consumer-update (apps/* + любые публикации). Не критично для нашего pre-release состояния, но честно фиксируется.
**−** Новый пакет `boost-matrix` — +1 OWNERSHIP, +1 build-target, +1 lockfile entries, +1 owner-агент (новый, требует `.claude/agents/` setup + restart).
**−** Placeholder'ы (Ui.Map/Flow/Chart) — work для owner-web-ui; не тривиальные «просто SVG», требуют API-shape компатибельный с booster.

## Альтернативы (rejected)

- **`@capsuletech/{table,map,flow,…}` (drop `web-`):** короче, но размывает namespace `web-*` (что туда теперь относится?). Конфликт с потенциальными top-level utility-пакетами в будущем. `boost-*` явно сообщает роль.
- **`@capsuletech/x-*`:** компактнее, но мутно. `boost-` читается без объяснения.
- **`web-*` + metadata-флаг `capsule.kind: 'booster'`:** не меняет namespace; флаг прячется в package.json. Невидимо в imports. Контрибьютор не отличит booster от kit без чтения package.json.
- **Matrix-light примитив в web-ui:** не нужен — `Ui.Layout.Grid` покрывает static-layout кейс. Heavy-Matrix добавляется через boost-layout augmentation (Decision 5). Один namespace — два уровня tier'а.
- **`boost-matrix` как имя пакета** (исходно предлагалось): отвергнуто amendment 2026-06-12 — Matrix это **конкретный layout-вариант** (рядом с Flex / Grid), не отдельная категория. Корректное имя — `boost-layout` (по расширяемому kit-namespace).
- **Matrix остаётся в web-shell, но subpath переименовать на `/grid`:** не решает проблему смешения concerns; cross-app consumers всё ещё тянут весь web-shell ради Matrix.
- **CapsuleOutlet НЕ wrapper, а modification TanStack Outlet:** требует fork tanstack-router'а или monkey-patch'а. CapsuleOutlet как wrapper — чистый pattern, не блокирует апгрейды tanstack.
- **vt-name в web-style глобал, без CapsuleOutlet:** не решает «откуда вычислить depth». Centralized в web-router — единое место.

## Roll-out

Архитектура — на бумаге; исполнение в live-плане. Phases:

- **Phase A** — ADR 046 merge + agent roster setup (новый owner-boost-layout, restart). ⚠ Amended: agent name changed `owner-boost-matrix` → `owner-boost-layout`.
- **Phase B** — Matrix relocation (boost-layout scaffold + shell strip + apps import-fix) ‖ boost-* renames (table/map/flow/chart). ⚠ Amended: `boost-charts` → `boost-chart` singular; B6 placeholder restructure под augmentation-ready namespace'ы (`Ui.Map.View`, `Ui.Flow.Diagram`, `Ui.Chart.<basic>`).
- **Phase C** — vt-rework (CapsuleOutlet + DepthContext + Ui.Outlet swap + CSS selectors). ✅ Closed 2026-06-12.

Phase B и Phase C **параллельны** — разные файлы, разные owner-агенты. Renames внутри Phase B параллельны между собой.

Полная декомпозиция, sequencing, agent-роли, статус-tracker — `docs/_meta/web-rework-plan.md`. Этот ADR не обновляется по мере выполнения; обновляется plan-doc.

## Ссылки

- [[045-web-taxonomy]] (частично superseded #1)
- [[044-web-menu-package]] (граница heavy=pkg / light=kit-composition)
- [[029-widget-frame-chrome]]
- [[033-package-registration]]
- [`docs/_meta/web-rework-plan.md`](../../_meta/web-rework-plan.md) (live execution)
- [`docs/_meta/web-audit.md`](../../_meta/web-audit.md) (state snapshot)
- Closed PR #299 (Shell.Matrix consume — wrong layer; cf. Decision 4)
- Merged PR #298 (useRouteDepth hook contract — impl rewritten in Phase C)
- Merged PR #295 (web-shell /layout subpath — to be reverted per Decision 2)
