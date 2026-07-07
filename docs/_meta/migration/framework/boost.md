# Аудит: boost zone (chart / flow / layout / map / table)

- **Путь:** `packages/web/boost/*`
- **Аудит:** 2026-07-07

Boost = heavy-mirror бустеры: augment'ят лёгкие kit-плейсхолдеры (`Ui.Chart`/`Map`/`FlowDiagram`/`Layout`) тяжёлым vendor-кодом. Данные инжектятся, движки не дублируются (композитор, не «технология»).

## @capsuletech/boost-layout (0.0.0, alpha, P1) — 🟡 FIX-BEFORE-MIGRATE

Heavy Layout booster — Matrix (resize/DnD/persist), эвакуирован из web-shell (ADR 046 D2). **src=21 test=18 — хорошо покрыт.** P1 — playground/ewc/nexus подключают. Border-редизайн (per-side `BorderValue`, resize-стык инверсия, единый `border`-токен) — верифицирован user'ом live (закрыл двойную линию img_9/10).

**🟡 причины:**
- **Active blocker (CC-8):** D5 augmentation runtime hook (`Object.assign` в `Ui.Layout`) **не реализован в web-core** — апы пишут `<Layouts.Matrix/>` (programmatic axis), а `<Ui.Layout.Matrix/>` не работает. Т.е. namespace-augmentation обещана, но не подключена.
- **Frontmatter drift:** `status: scaffold` в frontmatter vs «alpha» в теле. Версия 0.0.0 при том что пакет substantial+used.
**Действие:** закрыть D5 (web-core coordination) ИЛИ зафиксировать `Layouts.*` как канон-ось; выровнять status/версию; бренд-rename; AI-anchor. Код зрелый — гэп в augmentation-wiring, не в самом Matrix.

## @capsuletech/boost-map (0.0.1, alpha) — 🟡

MapLibre GL + Solid wrapper (3D/theme/reactive; layers/markers/clusters/terrain/sky). **src=12 test=11 — хорошо покрыт.** Memory-leak solid-map-gl **закрыт** drop-wrapper'ом ([[project_memory_leak_solid_map_gl]]). biome-ignore в тестах (useArrowFunction для constructor-моков) — аннотированы. Все 6 sub-компонентов зарегистрированы в `Ui.MapView.*` через web-core.
**Действие:** версия 0.0.1 при зрелом коде — поднять; бренд-rename; AI-anchor. Малый риск, почти 🟢.

## @capsuletech/boost-chart (0.1.1, alpha) — 🟠 UNDER-QUESTION (ZERO тестов)

Heavy chart booster (augment `Ui.Chart`). **src=7 test=0 — НЕТ тестов.** Versioned (0.1.1), но vendor-обёртка (charting-движок) не покрыта совсем.
**Действие:** heavy vendor-код без тестов = не эталон. Добавить тесты (рендер + reactive data) ДО переноса, либо отложить. Проверить, используется ли реально в апах (если нет — кандидат в defer). Бренд-rename.

## @capsuletech/boost-flow (0.1.1, alpha) — 🟠 UNDER-QUESTION (ZERO тестов, крошечный)

Heavy flow-diagram booster (augment `Ui.FlowDiagram`). **src=4 test=0 — НЕТ тестов, минимальный.** Скорее ранний скелет с версией.
**Действие:** проверить зрелость/использование; вероятно defer до реальной потребности. Тесты обязательны до переноса. Бренд-rename.

## @capsuletech/boost-table (0.0.0, scaffold) — 🟠 UNDER-QUESTION (CC-6 mid-extraction)

Полная re-экстракция table из web-ui (ADR 033 → `Tables.*` global): composites/dataTable + primitives/table + lib/{infiniteScroll,pagination} + controller + provider + capsule-регистрация. **src=23 test=6.** Параллелен **живому** web-ui/composites/dataTable (см. [web-ui.md](web-ui.md) CC-6). `dataTable.contract.ts` — file-level `eslint-disable no-explicit-any`.
**Действие / развилка (CC-6):** решить дубль — достроить boost-table и снять table из kit (консистентно с chart/map/flow), ИЛИ отменить boost-table, оставить DataTable в kit. Определяет дом DataTable-infinite-quirk. **Флажок user'у.**

## Pass-2 usage-verify (2026-07-08) — boost-chart/flow НЕ используются

Grep по всему репо (`Ui.Chart|Ui.FlowDiagram|Charts.|Flows.|@capsuletech/boost-(chart|flow)`):
совпадения ТОЛЬКО внутри самих пакетов — kit-плейсхолдеры (`kit/ui/primitives/{chart,flow-diagram}`),
регистрация (`runtime/core/imports.tsx`), zones/config. **Ноль `apps/*`.** Отдельный grep по
`apps/` на `Chart|FlowDiagram` — **No files found**.

**Вывод:** boost-chart (src=7, test=0) и boost-flow (src=4, test=0) — **не потребляются ни одним
аппом**, тестов нет. Это не эталон и не в первой волне. **Вердикт firms → DEFER:** не переносим
as-is; строим свежими (с тестами) когда появится реальная потребность в чарте/флоу. kit-плейсхолдеры
`Ui.Chart`/`Ui.FlowDiagram` тоже никем не рендерятся — при v2 решить, тащить ли placeholder-пару
или завести её вместе с booster'ом по потребности.

**CC-6 table-дубль + usage (verified 2026-07-08):** `DataTable`+`infiniteScroll` дублированы в
**kit** (`kit/ui/composites/dataTable` + `lib/infiniteScroll`) И **boost-table** (полнее:
provider/controllers/contract/tests — ADR 033 extraction target). НО grep `DataTable|Tables.|
infiniteScroll` по `apps/` → **1 хит, и тот `apps/OWNERSHIP.md` (doc)**. **Ноль app-код-потребителей
таблицы.** → CC-6 развилка (достроить boost-table vs оставить kit) — **ниже ставками**: ничего не
ломается (нечему), DataTable-infinite-quirk (cold-empty) **moot** пока не используется. v2: выбрать
чистый путь без давления (доделать extraction ИЛИ отложить весь table-стек до реальной потребности).

**Сквозной вывод boost:** chart / flow / table — **все три heavy-компонента без живых app-потребителей**
(built/extracted вперёд спроса). v2-урок: не тащить heavy-обвязку до потребности; завести по факту
нужды с тестами. Это снимает давление с 3 развилок разом (chart/flow/table = defer-until-needed).

## Итог по зоне

| Пакет | Вердикт |
|---|---|
| boost-layout | 🟡 — зрелый+tested, но D5 augmentation-хук не готов (CC-8) |
| boost-map | 🟡 — почти 🟢, поднять версию |
| boost-chart | 🟠 — ZERO тестов на vendor-обёртке |
| boost-flow | 🟠 — ZERO тестов, крошечный, вероятно defer |
| boost-table | 🟠 — CC-6 mid-extraction дубль (развилка) |
