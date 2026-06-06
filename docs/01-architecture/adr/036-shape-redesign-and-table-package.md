---
tags: [hca, adr, accepted]
status: accepted
date: 2026-06-06
---

> [!info] Status
> **Accepted (направление)** — 2026-06-06. Контракт Shape (двухфазная форма + HKT-маркер для типизации row) доказан type-спайком под боевым strict (`packages/web/core/src/wrappers/shape/__tests__/hkt-spike.test-types.ts`). Таблица выносится в `@capsuletech/web-table` (ADR 033-style). Реализация — по фазам через owner'ов (web-core / web-table / shared-zod / builders) + миграция ewc. owner-web-table вызываем после рестарта сессии.

# ADR 036 — Редизайн Shape (типизированный presentation-recipe) + вынос таблицы в пакет

## Контекст

Слои HCA имеют чёткие зоны: Entity декларирует сущность, View собирает UI, Widget дирижирует данными, Feature — бизнес-логика, Controller — поведение. **Shape был размазан** — концепция «стек данных + компонент» понятна, но:

1. **Плоский конфиг** (`{ schema, defaults, as, itemAs, itemProps, columns, ... }`) — всё в одном объекте, неясная иерархия.
2. **Типы шаблона стираются.** Shape достаёт шаблон через `ui` (`IShapeUi = Record<string, any>` Proxy) и хранит `as?: ValidComponent`. Тип конкретной таблицы теряется → методы (`getRowId`/`isRowActive`/`columns.accessorFn`) и `data` не типизированы по строке. App-код вынужден руками объявлять row-тип и аннотировать колбэки.
3. **DataTable тяжёлый** (tanstack-table + virtual, ~126KB lazy) и будет расти (фильтры, пиннинг, группировка) — в lean stateless-kit `@capsuletech/web-ui` ему тесно.

Цель — сделать Shape **максимально мощным, но не раздутым**, с типизацией из коробки, и дать таблице свой дом.

## Решение

### 1. Идентичность Shape — типизированный presentation-recipe

Shape **связывает форму данных (zod) с компонентом-контейнером, который их рисует**. Границы:

- **Data-external.** Shape НЕ владеет данными и не грузит их — `data` приходит сверху (Widget кормит store'ом). Shape описывает «как нарисовать», не «откуда взять».
- **Не композирует вверх.** Shape не встраивает Widget/View как слоты (`toolbar: <Widgets.X/>` — нарушение: Widget выше Shape). Композиция разных под-блоков — задача Widget'а.
- **Stateless-recipe.** Ниже Widget. Один Shape = одна форма данных, привязанная к одному контейнеру.

### 2. Двухфазный контракт (доказан спайком)

```tsx
Shape(
  (ui) => ({ schema, as /*, item */ }),   // arg1 — BIND: данные + чем рисуем (с ui)
  (props) => ({ /* presentation-конфиг */ }), // arg2 — CONFIG: row-типизирован, видит props (или просто объект)
);
```

- **arg1** фиксирует `schema` (→ row) и `as` (контейнер/шаблон, несёт type-маркер). `ui` инжектится сюда (per-instance proxy-трекер для event-binding `as`/`item`; глобалом быть не может).
- **arg2** — row-зависимая конфигурация (`columns`, `item.props` и т.п.). Row выводится из `schema` arg1 и **втекает** в arg2. **`ui` тут НЕ нужен** (контент берёт компоненты из глобалов `Views.*`/`Tables.*`; event-binding ячеек — через свой controller таблицы, §6). arg2 = **объект ИЛИ `(props) => config`** — видит консьюмер-props (row-типизированные), выполняется per-instance реактивно. Это даёт **мутацию/дерайв полей** для презентации (привести поле к виду, вычислить одно из нескольких) — чистая `props → представление` трансформация. НЕ обработка событий/инпута/side-effects — то Controller/Feature (иначе размываем границу §1).
- **Почему два аргумента, а не один объект:** TS не пробрасывает `S`, выведенный из поля `schema`, на соседние поля **того же** объектного литерала (sibling-inference limit). Разнесение в отдельные аргументы разрывает цикл — row резолвится в arg1 до того, как типизируется arg2. (Доказано: вариант B/один объект — `row: unknown` в columns; двухфазная форма — `row: Incident`.)
- **Impl-нюанс (внутри web-core, app-форму не меняет):** при generic-диспетчеризации по нескольким шаблонам (`ApplyRow<MarkerOf<A>>`) форма с `(props)`-arg2 в union'е (`объект | функция`) требует свести к конкретным props либо перегрузок per-template; чистый дисптач без перегрузок проще держит вариант «arg2 всегда функция». owner-web-core добивает при реализации.

### 3. Нейминг батч-рендера

- `as` — **контейнер** (`ui.Group` / `Tables.DataTable`). Единственный `as` на верхнем уровне.
- `item: { use, props }` — **каждый элемент**: `use` (а не `as`, чтобы не было двух `as`) — компонент элемента; `props: (it) => ({...})` — маппер (с полиморфным `as` уже у самого элемента, напр. `as: ui.Link`).
- Простой кейс — без `item`: `as: ui.Button` рисует данные напрямую.

### 4. Типизация без дубля — HKT-маркер на шаблоне

Шаблон несёт phantom-маркер `__tpl` (HKT-эмуляция):

```ts
interface DataTableTemplate { row: unknown; props: IDataTableProps<this['row']>; }
type ApplyRow<M, R> = (M & { row: R })['props'];
type RowOf<S> = S extends ZodArray<infer E> ? z.infer<E> : z.infer<S>;
```

Shape выводит `RowOf<schema>` и применяет к маркеру → `columns`/`item.props` (arg2) и методы консьюмера (`getRowId`/`isRowActive`/`data`) типизируются строкой. **Нулевой дубль**: сущность названа один раз (в `schema`), таблица — один раз (в `as`); явный generic и ручные аннотации не нужны.

**Подводный камень:** `this['row']` валиден только на top-level property интерфейса-маркера. Для nested-структур (`item.props`) маркер оборачивает их во внешний generic-helper (`IGroupProps<TRow>`), чтобы `this` остался наверху. (TS2526 иначе.)

Фолбэк, если где-то поплывёт: явный generic `Shape<Tables.DataTable<Row>>` (row дважды) — рабочий базовый вариант, не костыль.

### 5. `Zod` — глобал, не инжект через core

zod живёт в `@capsuletech/shared-zod`. Вместо инжекта `z` в фабрику — глобал `Zod` (auto-import, как `Entities`/`Tables`). В конфиге: `schema: Zod.array(Entities.Incident.schema)`. Касается и `Entity` (тоже переедет с инжекта `z` на `Zod`-глобал).

### 6. Таблица → `@capsuletech/web-table`

Вынос домена «таблица» из web-ui (как Matrix→web-shell, MapView→Maps, ADR 033):

- Переносятся DataTable + raw Table + lib (`createInfiniteScroll`/`createPagination`) + tanstack-deps. **web-table зависит от web-ui.**
- Приходит глобалом `Tables.*` через `capsule.app.ts: packages`. Уходит из `Ui.*` (опт-ин: таблица нужна не во всех аппах, в отличие от Button).
- **Свой controller-слой** (`/controllers` + `useEmit`, ADR 032) — события строк эмиттит сама, НЕ через UiProxy core'а. Флоу как у всех domain-пакетов.
- **Row-generic** `IDataTableProps<TRow>` + phantom-маркер `__tpl` для Shape-типизации; codegen отдаёт dotted-тип `Tables.DataTable`.
- **Под-компоненты + Provider («super-shape»).** Пакет дробится на саб-компоненты (DataTable не монолит). App может раскидать саб-компоненты по разным виджетам, а общие данные держит Provider/super-shape. Точный механизм shared-data Provider — проектирует owner-web-table (см. обсуждение); принцип: одна сущность → несколько саб-презентаций, общие данные через провайдер, у каждого саб-компонента свои локальные данные.

## Последствия

- **Миграция всех Shape** на двухфазную форму + `Zod`-глобал (ewc: `incidentsTable`, `incidentPreview`, `shellNavigation`; ui-creator: `navigation`).
- **Entity:** `z`-инжект → `Zod`-глобал.
- **Кросс-пакетная реализация (по owner'ам):** web-core (Shape-редизайн `Shape(bind, config)` + HKT-биндинг), web-table (вынос + row-generic + `__tpl` + controller-слой + Provider/саб-компоненты), shared-zod (`Zod`-глобал), builders (codegen `Tables.DataTable` generic-тип + инжект `Zod`-глобала).
- owner-web-table вызываем **после рестарта** сессии (new-agent constraint).

## Альтернативы (отклонены)

- **Один объект-конфиг (вариант B, auto-derive row из schema в том же литерале)** — `columns` получают `row: unknown` (sibling-limit). Отклонён.
- **Явный generic `Shape<Tables.DataTable<Row>>` (вариант A)** — работает, но row пишется дважды (schema + generic). Оставлен как фолбэк, не основной.
- **`ui` как глобал** (чтобы arg1 был plain-object) — ломает per-instance proxy-трекер event-binding'а. Отклонён.
- **`itemAs` + `itemProps` раздельно** — объединены в `item: { use, props }`.
