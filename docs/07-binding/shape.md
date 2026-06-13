---
tags: [hca, binding, shape]
status: documented
---

# Shape — типизированный presentation-recipe (v2, ADR 036)

**Файлы:**
- `packages/web/core/src/wrappers/shape/wrapper.tsx` — фабрика (двухфазная форма)
- `packages/web/core/src/wrappers/shape/ui-tracker.ts` — path-tracker для `bind.as`
- `packages/web/core/src/wrappers/shape/context.tsx` — `ShapeUiContext` (проброс Ui)
- `packages/web/core/src/wrappers/shape/types.ts` — типы (HKT-маркер, overloads)

Shape — **typed presentation-recipe**: связывает форму данных (zod) с компонентом-контейнером, который их рисует. Границы:
- **Data-external** — Shape НЕ владеет данными; `data` приходит сверху (Widget кормит store'ом).
- **Stateless-recipe** — ниже Widget. Один Shape = одна форма данных + один контейнер.
- **Не композирует вверх** — Shape не встраивает Widget/View как слоты.

## Двухфазная форма (v2)

```ts
Shape(
  (ui) => ({ schema, as /*, item */ }),   // BIND: данные + чем рисуем (с ui)
  (props) => ({ /* presentation-конфиг */ }), // CONFIG: row-типизирован, видит props (ИЛИ объект)
);
```

- **arg1 (bind)** — вызывается на module-load. Фиксирует `schema` (→ row) и `as` (контейнер/шаблон, несёт `__tpl` маркер). `ui` — per-instance path-tracker.
- **arg2 (config)** — объект ИЛИ `(props) => config`. Row выводится из `schema` arg1 и **втекает** в arg2 (перегрузки per-template в `IShapeWrapper`). `ui` НЕ нужен. Выполняется per-instance реактивно (Solid `mergeProps(configSource)` — функция оборачивается в createMemo).

## Примеры

### Таблица

```tsx
const IncidentsTable = Shape(
  (ui) => ({ schema: Zod.array(Entities.Incident.schema), as: Tables.DataTable }),
  (props) => ({
    defaults: Entities.Incident.mock,
    sorting: true,
    infinite: { itemHeight: 40, mode: 'plain' },
    columns: [
      { accessorKey: 'id', header: 'ID' },
      { header: 'Заявитель', id: 'applicantName',
        accessorFn: (row) => row.applicant.name },   // row: Incident ✓ (без аннотации)
    ],
  }),
);
```

Консьюмер (виджет):
```tsx
<Shapes.IncidentsTable
  data={data()?.items ?? []}
  itemPayload={(row) => ({ id: row.id })}             // row: Incident ✓
  isRowActive={(row) => row.id === data()?.selected?.id}
  getRowId={(row) => row.id}
/>
```

### Навигация (batch-элементы, только arg1)

```tsx
const Navigation = Shape((ui) => ({
  schema: Zod.array(Entities.Nav.schema),
  as: ui.Group,                                       // path-tracker → контейнер
  item: {
    use: ui.Button,                                   // path-tracker → каждый элемент
    props: (it) => ({ as: ui.Link, to: it.to, children: it.label }),  // it: NavItem ✓
  },
}));
// arg2 не нужен — нет row-зависимого presentation-конфига
```

## Нейминг

- `as` — **контейнер** (единственный `as` на верхнем уровне). Принимает path-tracker (`ui.Group`) или компонент (`Tables.DataTable`).
- `item: { use, props }` — **каждый элемент**: `use` (не второй `as`) — компонент элемента; `props(it)` — маппер (полиморфный `as` у самого элемента).
- Простой кейс — без `item`: `as` рисует данные напрямую.

## Типизация (HKT-маркер)

Шаблон несёт phantom-маркер `__tpl` (HKT-эмуляция):

```ts
interface DataTableTemplate { row: unknown; props: IDataTableProps<this['row']>; }
type ApplyRow<M, R> = (M & { row: R })['props'];
type RowOf<S> = S extends ZodArray<infer E> ? z.infer<E> : z.infer<S>;
```

`IShapeWrapper` содержит перегрузки per-template:
1. Шаблон с маркером + arg2 → config типизируется через `ApplyRowFrom<A, RowOf<S>>`
2. Только bind (без arg2)
3. Plain-компонент без маркера + generic config

**Нулевой дубль**: сущность названа раз (`schema`), шаблон раз (`as`); явный generic не нужен.

Фолбэк: если шаблон не имеет `__tpl` — config = `Record<string, unknown>` (graceful).

## Runtime flow

1. `bind(ui)` → `{ schema, as, item?, ...bindExtras }` (module-load, один раз).
2. `config` = объект или функция — хранится как-есть.
3. При рендере:
   - template = consumer `as` ?? resolveTemplate(bind.as) ?? null.
   - configSource() — функция передаётся в `mergeProps` как source → createMemo внутри → реактивность.
   - `data` = consumer `data` ?? `config.defaults` ?? undefined.
   - extras: `resolvedBindExtras` < `configExtras` < `resolvedItem` < `consumer rest`.
   - `item.use/props` — trackers резолвятся через `realUi`.
   - `<Dynamic component={Template} data={data} {...extras} />`.

## Path-tracker

`bind(ui)` вызывается на module-load — реального Ui ещё нет. `ui` — Proxy-tracker, фиксирующий путь:

```ts
ui.Group        // → tracker с path = ['Group']
ui.Navigation.Item  // → path = ['Navigation', 'Item']
```

На render-этапе: `resolveByPath(realUi, path)` → реальный компонент из `ShapeUiContext`.

## ShapeUiContext

`ViewWrapper`/`WidgetWrapper`/`PageWrapper` оборачивают рендер в `<ShapeUiContext.Provider value={Ui}>`. Shape читает через `useShapeUi()`. Если рендерится без Controller (нет ctx) — базовый Ui (без proxy).

## Что Shape не делает

- **Не валидирует runtime**. `schema` нужна только для типизации.
- **Не управляет состоянием** — stateless. Все side-effects — в Controller/Feature.
- **Не загружает данные** — data-external. Widget кормит store'ом.
- **Не композирует другие Shape'ы**. Композиция — в Widget.

## Связанное {#related}

- [[036-shape-redesign-and-table-package|ADR 036]] — design rationale + HKT-доказательство
- [[shape-v2-and-table|docs/_meta/shape-v2-and-table.md]] — реализационный reference
- [[ui-proxy]] · [[controller-proxy]]
- [[layers]] · [[tagging-system]]
