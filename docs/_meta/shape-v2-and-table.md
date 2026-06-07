---
tags: [meta, shape, web-table, ai-anchor]
date: 2026-06-07
---

# Shape v2 + интеграция пакетов с архитектурой — полный reference

> Решение — [[036-shape-redesign-and-table-package|ADR 036]]. Финальная форма **доказана и проверена на реальном `IShapeWrapper`** (не моках) + на боевом ewc (PreviewCard, Navigation типизируются). Реализация Shape-флоу в web-core готова; пакет таблицы (`web-table`) дорабатывается под этот контракт (см. §8).

## 1. Идентичность Shape

Shape — **типизированный presentation-recipe**: связывает форму данных (zod) с компонентом-контейнером, который их рисует.
- **Data-external** — `data` приходит сверху (Widget), Shape не грузит.
- **Не композирует вверх** — не встраивает Widget/View (Widget выше Shape).
- Stateless-recipe, ниже Widget.

Допустимо в arg2: **мутация/дерайв полей для презентации** (`props → представление`, чистая функция). НЕ обработка событий/инпута — это Controller/Feature.

## 2. Финальная форма (двухфазная)

```tsx
Shape(
  (ui) => ({ schema, as }),                 // arg1 BIND: данные + контейнер (с ui)
  (ui, props) => ({ item / columns, … }),  // arg2 CONFIG: row-типизирован, с ui и props (или объект)
);
```

- **arg1** = `schema` (→ row) + `as` (контейнер/шаблон, несёт `__tpl`-маркер). `ui` — для `as: ui.Group` и т.п.
- **arg2** = презентация. Объект ИЛИ `(ui, props) => body`. `ui` — для компонентов внутри (`item.use`, ячейки); `props` — консьюмер-props (для дерайва полей). Row втекает из `schema` arg1.
- **Почему 2 аргумента:** TS не пробрасывает `S` из поля `schema` на соседние поля **того же** литерала (sibling-inference limit). Всё row-зависимое (`item`, `columns`) живёт в **arg2**, отдельно от `schema` → row выводится.

### Каноничные примеры

```tsx
// Таблица: as — глобал Tables.DataTable, columns в arg2 (row-типизированы)
const IncidentsTable = Shape(
  (ui) => ({ schema: Zod.array(Entities.Incident.schema), as: Tables.DataTable }),
  () => ({
    columns: [{ header: 'Заявитель', accessorFn: (row) => row.applicant.name }],  // row: Incident ✓
    sorting: true,
  }),
);

// Навигация: as — контейнер, item — шаблон элемента в arg2 (row-типизирован)
const ShellNavigation = Shape(
  (ui) => ({ schema: Zod.array(Zod.object({ label: Zod.string(), to: Zod.string() })),
             as: Shell.Header.Navigation }),
  (ui) => ({
    item: {
      use: ui.Button,
      props: (it) => ({ as: ui.Link, to: it.to, children: it.label }),  // it: {label;to} ✓
    },
  }),
);
```

## 3. Нейминг

- `as` — **контейнер** (`ui.Group` / `Tables.DataTable`), единственный на верхнем уровне (arg1).
- `item: { use, props }` (в **arg2**) — **шаблон элемента** батча: `use` (компонент элемента), `props: (it) => …` (маппер). НЕ `children` (зарезервированный JSX-проп); НЕ `child` (путается с `children`). Имя `item` совпадает с тем, что читают контейнеры (web-ui Group/List, web-shell Header.Navigation → `props.item`). Внутри `props` `children:` — настоящий проп элемента.
- Простой кейс — без `item`: `as: ui.Button` рисует данные напрямую.

## 4. ⚠️ Правила типизации (учтённые грабли) — ОБЯЗАТЕЛЬНО при правке пакетов

Эти четыре правила — то, обо что мы спотыкались. Маркер/`RowOf` резолвятся правильно; рвётся **проброс row в коллбэк пользователя**. Причины:

1. **Никакого отдельного `R`-дженерика.** В overloads `IShapeWrapper` row-тип инлайнится как `RowOf<S>`, НЕ как `<R extends RowOf<S>>`. Отдельный `R` в контравариантной позиции (`props: (it: R)=>`) TS выводит в `any`. (Было — сломало `item`.)

2. **Row-зависимые коллбэки — только в arg2.** `item.props`/`columns.accessorFn` обязаны быть в arg2 (отдельно от `schema` в arg1). В одном литерале со `schema` → sibling-inference → `it/row: any`. (Было — дескриптор в arg1 → `any`.)

3. **`as`-шаблон должен нести тип (с `__tpl`).** Глобалы (`Tables.X`, `Shell.X`) типизированы. `ui.X` — тоже: `IShapeUi` производится из `IViewUiRaw` (web-core/interfaces.ts), поэтому `ui.PreviewCard` несёт `__tpl`. **Новые ui-компоненты подхватываются авто** (без hardcode). Если `as` имеет тип `any` → `MarkerOf<any>` ломается → fallback `Record<string,unknown>` → row: any.

4. **Пропсы шаблона для коллбэков — ЧИСТЫЙ интерфейс, НЕ union.** `accessorFn: (row: TRow)=>…` контекстно-типизируется только если тип колонки — одиночный интерфейс. Сырой tanstack `ColumnDef<TRow>` — это **union** (accessor-key/accessor-fn/display/group), и контекст коллбэка сквозь union ломается → `row: any`. Пакет обязан экспортить **свой чистый** `IColumn<TRow>` (`{ id?, header?, accessorKey?: keyof TRow, accessorFn?: (row: TRow)=>…, cell? }`) и маппить в tanstack ВНУТРИ при рендере. (Это открытый фикс таблицы — §8.)

## 5. `Zod` — глобал

zod в `@capsuletech/shared-zod` → глобал `Zod` (auto-import). `schema: Zod.array(Entities.Incident.schema)`. `z`-инжект убран и из `Entity`.

## 6. 🔌 Гайд: как пакет стыкуется с нашей архитектурой

Чтобы domain-пакет (таблица, карта, чарты…) вёл себя **как родной composition-компонент** capsule:

**(а) Регистрация — ADR 033.** Subpath `/capsule` экспортит `defineCapsuleModule({ name: 'Tables', components: { DataTable, Table } })`. App подключает через `capsule.app.ts: packages: ['@capsuletech/web-table']` → глобал `Tables.*`. codegen генерит ambient-тип + namespace. НЕ в `Ui.*` (опт-ин: нужен не каждому аппу).

**(б) Маркер `__tpl` — для row-типизации в Shape.** Компонент (или его controller-обёртка, если она и регистрируется как глобал) несёт phantom:
```ts
interface DataTableTemplate { row: unknown; props: IDataTableProps<this['row']>; }
export const DataTable: (<TRow>(p: IDataTableProps<TRow>) => JSX.Element) & { readonly __tpl?: DataTableTemplate };
```
`this['row']` валиден **только на top-level property** маркера. Для nested-пропсов (напр. `item`-подобных) оборачивай во внешний generic-helper (`IGroupProps<TRow>`), иначе TS2526. Shape делает `ApplyRow<MarkerOf<typeof as>, RowOf<schema>>` → пропсы шаблона row-типизируются.
**Важно:** регистрируется тот компонент, что идёт в `as` — он и должен нести `__tpl` (если регистрируешь controller-обёртку, маркер форвардни на неё).

**(в) События — ADR 032.** Свой `/controllers`-слой: компонент эмиттит ИМЕНОВАННЫЕ события через `useEmit` в ближайший app-Feature; НЕ через UiProxy core'а. Phantom `__events` → `EventsOf<typeof Tables.DataTable>` → `Feature<…Events>` типизирует `target.payload`. (codegen генерит `Tables.X.Events` namespace.)

**(г) Чистые пропсы коллбэков.** Любой prop-коллбэк, типизируемый по row (`columns`/`accessorFn`/`cell`/`item.props`), — через ЧИСТЫЙ интерфейс пакета, не сырой сторонний union (см. §4.4).

**Итог потока:** `as: Tables.DataTable` → codegen-глобал (typed, с `__tpl`) → Shape `ApplyRow` row-типизирует config arg2 → события строк через свой controller → app-Feature ловит типизированно. Полностью как ручная HCA-сборка, но через конфиг.

## 7. Статус Shape-флоу (web-core) — ГОТОВО

- Ядро (real `IShapeWrapper`, arg2 row-коллбэк) — ✅
- `ui.X`-шаблоны несут `__tpl` (мод C, PreviewCard) — ✅
- batch `item.props` в arg2 (мод B, Navigation) — ✅
- Таблица выпилена из `Ui.*` (ADR 033) — ✅
- `R`-дженерик убран, `IShapeUi` ← `IViewUiRaw` — ✅
Тесты: `shape-real-wrapper.test-types.ts` (честный, на реальном wrapper) + web-core unit зелёные.

## 8. Открыто — таблица (мод A)

`IColumn<TRow>` в web-table сейчас = сырой tanstack `ColumnDef` (union) → `accessorFn`-row не типизируется (§4.4). **Следующий шаг:** owner-web-table меняет `IColumn` на чистый одиночный интерфейс + маппинг в tanstack при рендере. После этого `incidentsTable.columns` row-типизируется, как nav/preview.
