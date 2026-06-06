---
tags: [meta, shape, web-table, ai-anchor]
date: 2026-06-06
---

# Shape v2 + пакет таблицы — полное описание

> Дизайн **зафиксирован и доказан** (type-спайк `packages/web/core/src/wrappers/shape/__tests__/hkt-spike.test-types.ts`). Решение — [[036-shape-redesign-and-table-package|ADR 036]]. Реализация — следующая фаза (owner-web-table после рестарта + owner-web-core / owner-shared / owner-builders). Эта страница — реализационный reference с каноничными примерами.

## 1. Идентичность Shape

Shape был «размазан». Теперь — **типизированный presentation-recipe**: связывает форму данных (zod) с компонентом-контейнером, который их рисует. Границы:

- **Data-external** — Shape НЕ владеет данными и не грузит их; `data` приходит сверху (Widget кормит store'ом). Shape отвечает «как нарисовать», не «откуда взять».
- **Не композирует вверх** — Shape не встраивает Widget/View как слоты (Widget выше Shape). Композиция под-блоков — задача Widget'а.
- **Stateless-recipe**, ниже Widget. Один Shape = одна форма данных + один контейнер.

Допустимо: **мутация/дерайв полей для презентации** (привести поле к виду, вычислить одно из нескольких) — чистая `props → представление`. Недопустимо: обработка событий/инпута/side-effects — это Controller/Feature.

## 2. Двухфазная форма (доказана спайком)

```tsx
Shape(
  (ui) => ({ schema, as /*, item */ }),     // BIND: данные + чем рисуем (с ui)
  (props) => ({ /* presentation-конфиг */ }), // CONFIG: row-типизирован, видит props (или просто объект)
);
```

- **arg1** фиксирует `schema` (→ row) и `as` (контейнер/шаблон, несёт type-маркер). `ui` инжектится сюда (per-instance proxy-трекер для `as`/`item`; глобалом быть не может).
- **arg2** — row-зависимый конфиг. `ui` НЕ нужен (компоненты ячеек берутся из глобалов; event-binding — через свой controller таблицы). Объект ИЛИ `(props) => config`; видит консьюмер-props, выполняется per-instance реактивно → мутация/дерайв полей.
- **Почему 2 аргумента:** TS не пробрасывает `S` из поля `schema` на соседние поля **того же** литерала (sibling-inference limit). Разнесение по аргументам разрывает цикл — row резолвится в arg1 до типизации arg2. (Один объект → `row: unknown` в columns; две фазы → `row: Incident`.)

### Каноничный пример — таблица

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
Консьюмер (виджет) — без `type IIncident` и без аннотаций:
```tsx
<Shapes.IncidentsTable
  data={data()?.items ?? []}
  itemPayload={(row) => ({ id: row.id })}             // row: Incident ✓
  isRowActive={(row) => row.id === data()?.selected?.id}
  getRowId={(row) => row.id}
/>
```

### Каноничный пример — навигация (батч-элементы)

```tsx
const Navigation = Shape((ui) => ({
  schema: Zod.array(Entities.Nav.schema),
  as: ui.Group,                                       // контейнер
  item: {
    use: ui.Button,                                   // каждый элемент (use, не второй as)
    props: (it) => ({ as: ui.Link, to: it.to, children: it.label }),  // it: NavItem ✓
  },
}));
// arg2 не нужен (нет row-зависимого конфига вроде columns)
```

## 3. Нейминг

- `as` — **контейнер** (`ui.Group` / `Tables.DataTable`), единственный на верхнем уровне.
- `item: { use, props }` — **каждый элемент**: `use` (не второй `as`) — компонент элемента; `props` — маппер (полиморфный `as` уже у самого элемента, напр. `as: ui.Link`).
- Простой кейс — без `item`: `as: ui.Button` рисует данные напрямую.

## 4. Типизация без дубля — HKT-маркер

Шаблон несёт phantom-маркер `__tpl`:
```ts
interface DataTableTemplate { row: unknown; props: IDataTableProps<this['row']>; }
type ApplyRow<M, R> = (M & { row: R })['props'];
type RowOf<S> = S extends ZodArray<infer E> ? z.infer<E> : z.infer<S>;
```
Shape выводит `RowOf<schema>`, применяет к маркеру → `columns`/`item.props` + методы консьюмера типизируются строкой. **Нулевой дубль**: сущность названа раз (`schema`), шаблон раз (`as`). Подвох: `this['row']` валиден только на top-level property — nested (`item.props`) оборачивать в generic-helper (`IGroupProps<TRow>`), иначе TS2526. Фолбэк (не основной): явный generic `Shape<Tables.DataTable<Row>>`.

## 5. `Zod` — глобал

zod в `@capsuletech/shared-zod` → глобал `Zod` (auto-import, как `Entities`/`Tables`), не инжект `z` через core. В конфиге: `Zod.array(Entities.Incident.schema)`. Касается и `Entity`.

## 6. Пакет `@capsuletech/web-table`

Вынос домена «таблица» из web-ui ([[033-package-registration|ADR 033]], как Matrix→web-shell):

- Переносятся DataTable + raw Table + lib (`createInfiniteScroll`/`createPagination`) + tanstack-deps. **Зависит от web-ui.**
- Глобал `Tables.*` через `capsule.app.ts: packages`. Уходит из `Ui.*` (опт-ин: таблица нужна не во всех аппах, кнопка — во всех).
- **Свой controller-слой** (`/controllers` + `useEmit`, [[032-package-controllers-and-useemit|ADR 032]]) — события строк эмиттит сам, не через UiProxy core'а.
- **Row-generic** `IDataTableProps<TRow>` + phantom `__tpl`; codegen отдаёт dotted `Tables.DataTable`.
- **Под-компоненты + Provider («super-shape»)** — DataTable дробится на саб-компоненты, app раскидывает их по разным виджетам, общие данные держит Provider. Механизм проектирует owner-web-table.

## 7. Порядок реализации

1. **owner-web-table** (после рестарта, founding): вынос + row-generic + `__tpl` + controller-слой + Provider/саб-компоненты.
2. **owner-shared** (`Zod`-глобал) + **owner-builders** (codegen `Tables.DataTable` + инжект `Zod`) — параллельно.
3. **owner-web-core**: Shape `Shape(bind, config)` + HKT-биндинг (+ multi-template dispatch).
4. **ewc-миграция**: шейпы на новую форму (`incidentsTable`/`incidentPreview`/`shellNavigation`), чистые виджеты без аннотаций.

> ⚠️ Враппер нельзя вкорячить в web-core до миграции — старая форма используется всеми текущими шейпами; новая форма требует `Zod`-глобал + маркеры таблицы. Реализация — скоординированной фазой, не фрагментом.
