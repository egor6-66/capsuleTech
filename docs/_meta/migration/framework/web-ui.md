# Аудит: @capsuletech/web-ui

- **Путь:** `packages/web/kit/ui`
- **Версия:** 0.2.0 · **Zone:** kit (единственный) · **Group:** web_base · **Priority:** P0
- **Роль:** stateless UI-kit — 16+ primitives + composites (DataTable, SectionedList, Article, Launcher, SegmentedBar, PreviewCard, DropdownMenu, Menu). Polymorphic (Kobalte Slot), CVA + createStyle, themed tokens only.
- **Аудит:** 2026-07-07

## Вердикт: 🟡 FIX-BEFORE-MIGRATE (код 🟢 самый канон-полный; гэпы — test-depth + доки + 2 known-quirk + table-развилка)

**Это ближайший к эталону пакет фреймворка** — component-model канон здесь реализован живьём (карточка=сущность data-driven слоты, композиции=пресеты в ките, kobalte-first, frozen token set). Код высокого качества. 🟡 — из-за глубины тестов, доки и двух незакрытых UI-квирков.

## Что хорошо (переносим, это референс)

- **Component-model канон реализован:** `Ui.Card` сущностный режим (слоты вкл/выкл + пресеты + вшитый a11y), composites `SectionedList`/`Article`/`Launcher`/`SegmentedBar` — визуальная композиция строго в ките пресетом, 2-слойная регистрация (manifest + Ui-namespace через web-core invariant). Ровно [[feedback_compositions_in_kit_for_store_renderer]] / [[feedback_product_wide_kit_layering]].
- **Placeholder / heavy-mirror паттерн (НЕ дубль!):** `Ui.Chart`/`Ui.Map`/`Ui.FlowDiagram` — лёгкие плейсхолдеры (subset API, 47-63 строки), которые boost-chart/map/flow **augment'ят** heavy-зеркалом → «migration rename-free / swap import». Чистый канон [[feedback_thin_provider_subpath_capabilities]].
- **Kobalte-first rule** — новые интерактивные примитивы обязаны оборачивать `@kobalte/core` (a11y-headless), не катать с нуля. [[feedback_prefer_existing_libs]].
- **Token-driven, frozen set** (ADR 042) — density-aware padding-токены, ноль arbitrary-классов, унифицированные radii. [[feedback_token_set_frozen]].
- **Vendor-депы аккуратно разложены** по peer/dep с обоснованием (kobalte/tanstack-table/virtual = peer singleton; cva/corvu = dep bundled; lucide = devDep). Dual-package hazard cva задокументирован (stateless → ок).
- **Богатейший OWNERSHIP** + Storybook (visual live-доки) + browser-tests (Chromium getComputedStyle против токенов, focus-visible, keyboard).

## Гэпы до эталона (v2 DoD = код+тесты+доки)

| # | Находка | Тяжесть | Действие |
|---|---|---|---|
| U1 | **Render-coverage миграция неполная (code-verified поправка).** OWNERSHIP заявляет «vitest не конфигурит vite-plugin-solid → .tsx нельзя импортировать» — это **УСТАРЕЛО**: `vitest.config.ts` **уже** содержит `solid({hot:false})` + jsdom + `deps.inline` для JSX-shipping депов; render-тесты РАБОТАЮТ (flex.test.tsx, matrix-suspense.test.tsx — реальный DOM-рендер). НО многие примитивы (**Table, DataTable, PreviewCard**) остались на **structural-only** тестах («Full DOM/render coverage pending» в test-таблице) — миграция на render не доведена. Maturity-bar «все primitives имеют DOM/render покрытие» не выполнен, но причина = **незавершённая миграция тестов**, не отсутствие транзформа. | **HIGH** | домигрировать structural→render тесты для Table/DataTable/PreviewCard/остальных; освежить OWNERSHIP (убрать stale-blocker про solid transform). Гейт эталона kit. |
| U2 | **Нет AI-anchor** `docs/_meta/web-ui.md` (roadmap high). | doc | написать при переносе. |
| U3 | **DataTable `infinite` (virtual-scroll) cold-empty quirk** — интермиттентный пустой body на cold reload (tanstack virtual-core race). Митигация откатана; sidestep = `infinite:{mode:'plain'}` (non-virtual). Незакрыт в корне. См. CLAUDE.md «Известные шероховатости». | known-issue | v2-решение: нести как known-issue + plain-дефолт, ИЛИ починить в корне (keyed-remount виртуалайзера / апгрейд solid-virtual). Верификация только в реальном браузере. |
| U4 | **Dropdown cold-first-open position flash** — первая раскрытие за сессию мелькает в left-top, потом прыгает к якорю (Kobalte positioner + async floating-ui). Косметика, first-click-only. Две попытки фикса откатаны. | known-issue (low) | нести как known-issue ИЛИ проверить fixed-версию @kobalte/core >0.13. |
| U5 | **W4 maturity pending:** bundle-size assertions (L0/L1 weight gradient не формализован) + build-time `manifest.json` генерация (studio-палитра на него опирается). | roadmap | закрыть в v2 при доведении до эталона. |
| U6 | **Prose несёт Obsidian-специфичные `.wikilink`/`.callout-*` стили**, парные к `web-docs` `render-markdown.ts` (Obsidian wikilinks/callouts). Конфликт с v2-решением «ноль Obsidian» — детали в `docs/_meta/migration/framework/misc.md` (web-docs секция). | canon-conflict | переносить синхронно с фиксом web-docs-резолвера (не по отдельности — стили и парсер один контракт). |

## CC-6 — table-развилка (структурная, требует решения)

web-ui владеет `primitives/table` (лёгкий) + `composites/dataTable` (реальный, инкапсулирует `@tanstack/solid-table`) — **живой источник** (0.2.0, апы через `Ui.DataTable`). Параллельно `@capsuletech/boost-table` (0.0.0) держит **полную re-экстракцию** того же: `composites/dataTable` + `primitives/table` + `lib/{infiniteScroll,pagination}` + controller + provider + capsule-регистрацию (ADR 033 — table как `Tables.*` global).

**Диагноз:** это НЕ чистый placeholder/heavy-split как chart/map/flow — это **mid-extraction дублирование**. boost-table начат (полный код), но web-ui'шный dataTable не снят и остаётся каноничным для апов.

**v2-решение (флажок user'у):** либо (а) **достроить boost-table** и убрать table/dataTable из kit (kit держит только лёгкий placeholder, как chart/map — консистентно), либо (б) **отменить boost-table**, оставить DataTable в kit-composites (тогда виз-примитивы chart/map/flow — исключение, а не правило). Развилка определяет, где живёт DataTable infinite quirk (U3).

## Известные quirk'и (канон-знание, переносится)

- Matrix corvu shrinking-array guard; no setPointerCapture (window-level listeners); WebGL canvas snapshot fallback (`toDataURL` try/catch → slate placeholder).
- Matrix middle-row inline `height/width:100%` (не flex-1 — corvu Panel parent `display:block`).
- Flex corvu-mode триггер = `resizable:true`, не факт items; случайное связывание данных → `console.warn` + fallback на children.
- Table scroll-context вынесен в parent (BREAKING v0.5.0) — standalone `<Table>` оборачивать в `overflow-auto`.
- Storybook devDeps отдельные — не quick-fix через global install.
