---
tags: [hca, adr, proposed, web, taxonomy, packages, boundary]
status: proposed
date: 2026-06-11
---

> [!info] Status
> **Proposed** — 2026-06-11. Открывает Phase 0 чистки `packages/web/`: фиксирует ментальную модель **на бумаге**, без structural-churn'а (rename'ы — параллельный трек после, по мере касания пакетов). Связано: [[029-widget-frame-chrome|029]] (frame=chrome, intrinsic), [[033-package-registration|033]] (merge регистраций), [[044-web-menu-package|044]] (граница heavy=пакет / light=кит-композиция), [[042-canonical-token-system-and-skin-contract|042]] (skin-контракт — поверхность стиля).

# ADR 045 — Таксономия `packages/web/*`: layout vs chrome, design-time консолидация, depth-scoped vt-name

## Контекст

Группа `packages/web/*` развивалась рывками — несколько эталонных решений (web-core/state/ui) + черновые накопления вокруг них. Перед физической чисткой (Phase 0) нужно **зафиксировать модель словами**, чтобы:

1. аудит (knip/syncpack/madge → `docs/_meta/web-audit.md`) читался через единые границы, а не «как сложилось»;
2. последующие structural-PR'ы (rename'ы, переезды) шли **touch-once** по мере касания пакета, а не отдельной перепланировкой;
3. owner-агенты говорили на одних терминах.

Три накопленных перекоса:

- **`web-shell` смешивает два слоя.** Внутри живут и **структурные примитивы layout'а** (Matrix/cells/regions — stateless каркас), и **connected-блоки chrome'а** (Header, ModeToggle, Appearance, FinishSettings — несут состояние / читают сторы / эмитят события через `useEmit`). Это разные tier'ы по [[029-widget-frame-chrome|029]] — stateless каркас и stateful chrome не должны жить в одном subpath без явного разделения.
- **design-time распылён** между `web-creator` (planned: subpath-редакторы ui/style/text/logic + общие тулзы palette/tree/inspector/canvas/data/monitor/catalog) и `web-ui-creator` (manifests + state + inspector + generators). По `docs/playground/` уже решено, что это **один пакет с subpath'ами**, но кодом ещё два пакета — нужна каноничная фиксация в ADR.
- **Routing view-transition** держит **глобальный** `view-transition-name: capsule-content` на main-cell `Shell.Matrix` ([PR #264](https://github.com/egor6-66/capsuletech/pull/264)). На вложенных layout'ах (workspace внутри app-shell, sub-page внутри workspace) это даёт **groupping-конфликт**: одна и та же группа склеивает анимации разных Outlet'ов между собой → анимация всегда одна, прыжки на под-навигации.

## Решение

### 1. `web-shell` → расщепить на `layout` + `chrome` (subpath'ы внутри ОДНОГО пакета)

> **Пакет остаётся один (`@capsuletech/web-shell`), но содержимое расщепляется на ДВА subpath-ярyса с разной природой.**

| subpath | tier | что лежит | состояние | impl |
|---|---|---|---|---|
| `/layout` | **tier-1** stateless | `Matrix`, `Region`, `Cell`, slots — структурный каркас аппа | без сторов, без `useEmit`, БЕЗ DOM-side-эффектов | чистая композиция web-ui примитивов |
| `/chrome` | **tier-2** connected | `Header`, `ModeToggle`, `Appearance`, `FinishSettings`, будущий `Sidebar`/`Footer`/`CommandBar` | сторы (web-style, web-auth), `useEmit`, controller-биндинги | использует `Ui.Menu`/`Ui.Dropdown` (ADR 044) |

Почему **не два пакета**: `chrome` сильно завязан на `layout` (вкладывается в Matrix-region'ы как контент); расщепление на пакеты добавило бы pkg-границу там, где живая граница — внутренний tier. **Subpath'ы достаточны** + это enforce'ится compliance'ом (layout НЕ импортит chrome, chrome МОЖЕТ импортить layout).

Дальше остальные subpath'ы у пакета сохраняются (`/ui` — переезжающие kit-расширения, `/controllers` — ADR-032 адаптер, `/capsule` — ADR-033 манифест).

**Граница с web-ui.** web-ui = **только листовые примитивы** (Button/Input/Card/...) + **лёгкие kit-композиции** (Menu, ADR 044). Структурные **layout-каркасы** (Matrix/Region/Cell) — НЕ в web-ui: они tier-1, но **app-уровневые**, со своим именованием регионов (`main`/`aside`/...), не «слепые» сетки. Это держит web-ui листом для `Input.Select` etc.

### 2. design-time: `web-creator ⊇ web-ui-creator` (один пакет, subpath'ы)

> **Один design-time пакет — `@capsuletech/web-creator`. `web-ui-creator` поглощается им как subpath-набор.**

Subpath'ы — **два рода**:

- **тулзы** (общие для всех редакторов): `/shell` `/palette` `/tree` `/inspector` `/canvas` `/data` `/monitor` `/catalog`;
- **редакторы** (конкретные surface'ы): `/style` `/ui` `/text` `/logic` `/app`.

Из `web-ui-creator` мигрируют на свои места:
- `/manifests` (реестр спецификаций компонентов, `getManifest`, `canAcceptChild`) → `/canvas` (рядом с резолвером tree → JSX) ИЛИ `/catalog` (стенд+контракты) — точное место решит owner-web-creator на founding-миграции;
- `/state` (`addNode`/`moveNode`/...) → `/canvas` (мутации tree.json);
- `/inspector` → `/inspector` (одноимённая тулза);
- `/generators` → `/ui` редактор (procedural UI как часть UI-редактора).

**`web-ui-creator` deprecated → drop** после миграции и parity-чекинга (как Storybook sunset). На время миграции — `web-ui-creator` живёт рядом, его API не расширяется, новые фичи льются только в `web-creator`. Удаление пакета = отдельный PR (owner-web-creator), синхронно с downstream-переключателями.

Это **уже было решено в `docs/playground/`** (creator.md + roadmap.md) — ADR кодифицирует словами без timeline-обязательств: «один пакет, subpath'ы, поглощает ui-creator».

### 3. Routing view-transition — **depth-scoped vt-name**

> **`view-transition-name` на main-region каждого `Shell.Matrix` уникален по глубине Outlet'а:** `capsule-content-<depth>`. Группа склеивает анимацию **только в рамках своего уровня** вложенности.

Сейчас (PR #264, в main) каждый `Shell.Matrix` main-cell несёт **константный** `view-transition-name: capsule-content`. На корневом `<Outlet>` это работает (одна группа = один main-регион). На вложенных layout'ах (workspace → web-studio с под-табами) две `Shell.Matrix` имеют **одинаковый** vt-name → браузер пытается морфить ВСЁ дерево как одну группу → бывает rip/flash при под-навигации.

**Канон:**
- `Shell.Matrix` принимает `depth?: number` (опц.; default `0` — корень) ИЛИ берёт глубину из контекста (предпочтительно — web-router уже знает depth текущего route-match);
- main-cell эмитит `view-transition-name: capsule-content-${depth}` через CSS-var на cell-узле;
- `web-style` `vt-route-content` глобальный класс расширяется — анимируется именованный регион по pattern'у `capsule-content-*` (CSS селектор `::view-transition-group(capsule-content-*)` — поддерживается в Chromium 126+; fallback — вручную перечислять до 3-4 уровней).

**Что это даёт:** под-навигация (web-studio: design/logic/monitor) морфит только под-main, корневой chrome остаётся неподвижным **на своём** уровне; смена workspace → app — морфит верхний main.

**Что НЕ делаем сейчас:** конфигурируемый duration/variant per-depth (отдельная задача, низкий приоритет). depth=0/1/2 со стандартным fade — достаточно для эталона.

## Что НЕ решает этот ADR (явно)

- Какие **именно файлы** переезжают из `web-ui-creator` куда — это founding-миграция owner-web-creator (отдельным PR'ом, после Phase 0 audit'а).
- Какие kit-composites переедут из app/web-shell в web-ui — это canon-проход по примитивам (Button → Card → Input...), задача #3 в Phase 0.
- Полный список subpath'ов `web-shell/chrome` (помимо Header/ModeToggle/Appearance) — растёт по мере касаний; ADR фиксирует **принцип** разделения, не roster.
- `web-access` / unified router guard — это [[037-playground-capability-and-codegen-subgenerators|037]] / playground access-док, не таксономия.

## Последствия

**+** Аудит читается через одни границы (layout vs chrome separately; design-time = один subpath-куст, не два пакета; routing-анимация ожидаемо depth-scoped).
**+** owner-агенты разговаривают на одном языке; новые блоки знают свой subpath сразу.
**+** rename'ы и structural-движения становятся **touch-once**: owner касается пакета → попутно приводит к таксономии. Не нужен «большой день переезда».
**−** Часть документации (агенты owner-web-shell / owner-web-ui-creator, AI-anchor'ы в `docs/_meta/`) станет неточной до touch'ев — фиксируется по мере проходов, не bulk-update'ом.
**−** depth-scoped vt-name требует поддержки браузером CSS-pattern'а `::view-transition-group(name-*)` (Chromium 126+); на старых ядрах — деградация в fade без depth-морфа (приемлемо).

## Roll-out

ADR — **на бумаге**, без code-churn'а:
1. **Сейчас:** merge ADR'а → язык фиксирован.
2. **Phase 0 шаг 2 (аудит):** `docs/_meta/web-audit.md` пишется уже **через** эту таксономию.
3. **Phase 0 шаг 3+ (canon-пилот Button):** идёт параллельно rename'ам — canon-axis (owner-web-ui) ‖ rename-axis (owner-web-shell, owner-web-creator), touch-once.
4. Depth-scoped vt-name — owner-web-shell + owner-web-router (контракт: router отдаёт depth, shell его читает), отдельным PR'ом ближе к Phase 0 завершению.

## Альтернативы (rejected)

- **`web-shell` → два пакета (`web-layout` + `web-chrome`):** избыточная pkg-граница; layout/chrome связаны живо (chrome вкладывается в layout-регионы); внутренний tier'ный enforcement (compliance) достаточен.
- **`web-creator` и `web-ui-creator` — оба пакета, дублируем тулзы:** прямой дрейф (две `palette`/два `inspector`); ровно то, от чего уходим. Уже решено в `docs/playground/`, ADR кодифицирует.
- **Глобальный `capsule-content` остаётся, depth кодируется через `<dialog>`-style overlay:** не покрывает under-shell sub-navigation; vt-name — это decoupled решение для **именно** route-морфа.
