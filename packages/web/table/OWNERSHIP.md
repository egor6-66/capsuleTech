# OWNERSHIP — @capsuletech/web-table

Owner-agent: **owner-web-table**

## Зона ответственности

Всё внутри `packages/web/table/` и только она. В чужие пакеты не лезем (POLICY п.1).

## Что это

Домен-пакет «таблица» для capsule: вынесен из `@capsuletech/web-ui` (ADR 033 —
как Matrix→web-shell, MapView→Maps), потому что web-ui это lean stateless-kit, а
таблица — тяжёлый растущий домен (sorting / virtual / infinite + будущие обвесы:
фильтры, пиннинг, группировка, колонки-резайз и т.д.).

Подключается стандартным флоу: `capsule.app.ts: packages: ['@capsuletech/web-table']`
→ глобал `Tables.*` (`Tables.DataTable`, `Tables.Table`). НЕ входит в `Ui.*`.

## Статус: SKELETON (0.0.0)

Создан скелет (configs + capsule-манифест + placeholder barrel). Код ещё НЕ
перенесён — это founding task.

## План миграции (founding task)

**Перенести из `@capsuletech/web-ui` в этот пакет** (с тестами и stories):
- `src/composites/dataTable/` → DataTable composite (tanstack-table + virtual).
- `src/primitives/table/` → raw Table parts (Header/Body/Row/Head/Cell).
- `src/lib/infiniteScroll/` (`createInfiniteScroll`) + `src/lib/pagination/` (`createPagination`).
- deps `@tanstack/solid-table`, `@tanstack/solid-virtual` (уже в package.json скелета).

**Multi-entry exports** (как web-ui): `.` (barrel), `./capsule`, плюс по вкусу
`./dataTable`, `./table`, `./lib`. Обнови `vite.config.mts` entry + package.json exports
+ tsconfig.base paths (через главного — aliasing single-source).

**Манифест** `capsule.ts`: `components: { DataTable, Table }` → `Tables.DataTable`, `Tables.Table`.

**Координация cross-package (через главного, НЕ сам):**
- `owner-web-ui` — удалить table/dataTable/lib из web-ui, убрать tanstack deps + exports.
- `owner-web-core` — убрать `Table`/`DataTable` из `Ui` namespace (`ui-kit/imports.tsx` +
  `interfaces.ts` ViewUiRaw/WidgetUiRaw), как при выносе Matrix. UiProxy events-only
  binder для `DataTable.Row` (`ui-proxy.tsx:132`) — проверить, что строки таблицы
  по-прежнему биндятся через meta (composite-internal rows).
- ewc shape `as: ui.DataTable` → `as: Tables.DataTable` (зона главного/app).

## Контракт типизации (решён — см. [ADR 036](../../../docs/01-architecture/adr/036-shape-redesign-and-table-package.md))

Дизайн утверждён и доказан type-спайком (`packages/web/core/src/wrappers/shape/__tests__/hkt-spike.test-types.ts`).

- **Row-generic** `IDataTableProps<TRow>` — `data`/`columns`/`getRowId`/`isRowActive`/
  `itemPayload` типизированы по `TRow`.
- **Phantom HKT-маркер** `__tpl` на компоненте таблицы:
  `interface DataTableTemplate { row: unknown; props: IDataTableProps<this['row']> }`.
  `this['row']` валиден ТОЛЬКО на top-level property — nested-пропсы оборачивай во
  внешний generic-helper (`IGroupProps<TRow>`), иначе TS2526.
- Shape (web-core, двухфазная форма `Shape((ui)=>({schema,as}), (ui)=>({columns}))`)
  выводит `RowOf<schema>` и применяет к маркеру → columns + методы консьюмера
  типизируются строкой без явного generic и ручных аннотаций.
- codegen (owner-builders) отдаёт dotted generic-тип `Tables.DataTable` (без импорта в апп).

## Controller-слой (ADR 032)

Таблица НЕ проксируется core'ом. У неё **свой** `/controllers` слой: события строк
(клик/выбор) эмиттит через `useEmit` в ближайший app-Feature — как web-shell/web-map.
НЕ полагаться на UiProxy composite-row binder.

## Под-компоненты + Provider («super-shape»)

DataTable — не монолит. Дробится на саб-компоненты, которые app может раскидать по
разным виджетам; общие данные держит Provider/super-shape (одна сущность → несколько
саб-презентаций, у каждой свои локальные данные). Точный механизм shared-data Provider
проектируешь ты (owner-web-table) — см. ADR 036 §6 + обсуждение.

## Известные баги (унаследованы из web-ui)

- **DataTable `infinite: virtual` — cold-empty quirk** (timing+memoization race в
  `@tanstack/virtual-core` 3.14.0). Сейчас обход — `mode: 'plain'`. Перенос в этот
  пакет — хорошая точка чинить по-настоящему (keyed-remount виртуалайзера по приходу
  реальной высоты, либо апгрейд `@tanstack/solid-virtual`). Верификация — только реальный
  браузер (jsdom не меряет). Детали — CLAUDE.md «Известные шероховатости».

## Release group

Пока standalone (git-tag versioning, как web-map/web-intl). Когда стабилизируется —
обсудить с главным добавление в `web_base` (fixed-versioning) вместе с web-ui/web-core.
