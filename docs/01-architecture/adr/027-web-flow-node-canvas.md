---
tags: [hca, adr, accepted]
status: accepted
date: 2026-06-02
---

# ADR 027 — Node-canvas примитив `@capsuletech/web-flow` (обёртка `@dschz/solid-flow`)

> [!info] Status: accepted
> Новый пакет **`@capsuletech/web-flow`** — обёртка над `@dschz/solid-flow` (Solid-порт React/Svelte Flow на официальном ядре `@xyflow/system`). Самостоятельный нод-канвас (свободные позиции + рёбра + pan/zoom + NodeResizer), **композируемый**, а НЕ режим `Layout.Matrix`. Спайк в `apps/nexus` подтверждён пользователем. Реализует — главный (initial owner; будущий owner-web-flow).

## Контекст

[[026-matrix-grid-canvas|ADR 026]] добавил grid-канвас в Matrix. Реальное использование (`apps/nexus` dashboard) показало, что нужная модель — **нод-граф**, а не tile-grid:

1. **«Двигать плавно»** (требование пользователя) структурно противоречит гриду — грид всегда снапит в клетки (ступенчато). Плавное = свободный пиксельный канвас.
2. **Связи между виджетами (рёбра)** — грид их не выражает. Nexus = «hub for nodes» → узлы соединяются.

Спайк `@dschz/solid-flow` в nexus (кастомные ноды рендерят реальные виджеты + NodeResizer + Handle-рёбра + minimap/controls, тема под `--xy-*`) — пользователь подтвердил: «то что надо». `@dschz/solid-flow`: MIT, `solid-js >=1.8`, построен на **`@xyflow/system`** (официальное ядро xyflow — тот же движок под React/Svelte Flow), есть NodeResizer/MiniMap/Zoom/colorMode. Версия alpha v0.1.4 — риск API-дрейфа гасится нашей обёрткой.

## Решение

Новый пакет **`@capsuletech/web-flow`** — обёртка над `@dschz/solid-flow`.

> **Самостоятельный нод-канвас-примитив, который КОМПОЗИРУЕТСЯ, а не встраивается режимом в Matrix.**

**Почему компоновать, а не `dndMode="flow"` в Matrix:** Matrix — это `rows[].cells[]`; swap/insert/grid — DnD-поведения над одной cell-моделью. Flow — `nodes[] + edges[] + pan/zoom`, состоянием рулит xyflow. Это другая модель данных. `dndMode="flow"` заставил бы Matrix хостить инородную модель и тянуть тяжёлый xyflow внутрь web-ui. Чисто: Flow — отдельный примитив, который кладётся как content ячейки Matrix (слот `main` в app-shell), когда нужна рамка/рейлы. «Flow внутри Matrix-лэйаута» — через композицию, и Flow работает где угодно без Matrix.

### Что даёт обёртка (ценность поверх голого solid-flow)

- **Capsule theme-bridge:** `colorMode` подвязан к активной теме `@capsuletech/web-style`; `--xy-*` переменные замаплены на наши токены (`--card`/`--border`/`--primary`/...). Консумер не возится с темизацией.
- **Custom-node эргономика:** рендер capsule-виджетов как нод (типизированный `data` → компонент), Handle/NodeResizer из коробки.
- **Палитра (rail→канвас):** drag-to-add новых нод через родной xyflow `onDrop`.
- **Типизированный nodes/edges API**, изолирующий консумера от alpha-дрейфа `@dschz/solid-flow`.
- **Изоляция зависимости:** `@dschz/solid-flow` + `@xyflow/system` лежат в этом пакете; приложения без нод-графа их не тянут.

### Инфраструктура (зона главного)

- Регистрация `@capsuletech/web-flow` в `tsconfig.base.json → paths`.
- `optimizeDeps.exclude` в `capsuleConfig.ts` (workspace-пакет не пре-бандлить).
- Релиз в группе **web_base** (fixed, tag `web@{version}`).
- `@dschz/solid-flow` — runtime-dep пакета (не peer): обёртка владеет версией.

## Альтернативы

| Вариант | Почему отвергнут |
|---|---|
| **`dndMode="flow"` в Matrix** | Модель-мисматч (rows/cells vs nodes/edges), куплинг тяжёлого xyflow в web-ui, третья инородная ветка в `renderRow`. |
| **Примитив в `@capsuletech/web-ui`** | Жизнеспособно, но тащит xyflow-dep во весь UI-kit. Отдельный пакет изолирует. (web-ui может ре-экспортнуть позже.) |
| **Старый `solid-flow` (miguelsalesvieira)** | Заброшен (последний коммит 2023). `@dschz/solid-flow` живой (2026) + на `@xyflow/system`. |
| **Свой нод-граф с нуля** | xyflow — зрелое ядро; «prefer existing libs». Самопал = месяцы на pan/zoom/edge-routing. |
| **Оставить грид для Nexus** | Ступенчато + нет рёбер. Грид остаётся capability в Matrix для tile-дашбордов без связей (ADR 026 не отменяется). |

## Последствия

**Плюсы:** переиспользуемый нод-канвас (Nexus + где угодно); чистое разделение Matrix(layout) / Flow(graph); тема интегрирована; зависимость изолирована; обёртка гасит alpha-дрейф solid-flow.

**Минусы / риски:** новый пакет + новая зависимость (`@dschz/solid-flow` alpha v0.1.4 + `@xyflow/system`) — трекаем релизы solid-flow, дрейф API ловим в обёртке. Инфра/релиз-оверхед нового пакета. Theme-sync для light/dark требует моста к web-style (сейчас спайк хардкодит `dark`).

## План (phase-per-PR)

1. **ADR 027** (этот).
2. **Scaffold `@capsuletech/web-flow`** + вынос спайк-обёртки → примитив `Flow` (custom-node эргономика, theme-bridge `--xy-*`). Главный (initial owner).
3. **theme-sync** — `colorMode` из активной темы web-style (убрать хардкод `dark`).
4. **Палитра** — rail→канвас drag-to-add через xyflow `onDrop`.
5. **Перепроводка `apps/nexus`** на `@capsuletech/web-flow`.
6. **(параллельно)** grid-полиш — оставить Matrix grid рабочей capability ([[026-matrix-grid-canvas|ADR 026]]).

## Связанное

- [[026-matrix-grid-canvas|ADR 026]] — grid-канвас (sibling-capability для tile-дашбордов; не отменяется)
- [[025-geometric-live-sortable|ADR 025]] — insert-DnD каркас Matrix
- [[web-ui|web-ui]] · Matrix композирует Flow в ячейку
