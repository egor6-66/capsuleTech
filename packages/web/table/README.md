# @capsuletech/web-table

Heavy table domain-mirror для capsule: DataTable composite + raw Table primitives + headless lib (`createInfiniteScroll`/`createPagination`). Engine: TanStack Table + virtual-scroll.  ·  zone: **boost**  ·  status: **scaffold (0.0.0)**

Light-mirror — `Ui.Grid` в `@capsuletech/web-ui` (kit). Принцип ADR 044: heavy = pkg / light = kit-композиция. Регистрируется как `Tables.*` global через ADR 033 `defineCapsuleModule`.

> **Будет переименован в `@capsuletech/boost-table`** в Phase W6 (one atomic main steward PR per [[web-rework-plan]] / ADR 046 D1).

## Install

```bash
pnpm add @capsuletech/web-table
# peer deps:
pnpm add solid-js
```

## Minimum usage

> **STATUS: scaffold** — публичный API в процессе (founding migration из web-ui composites/dataTable).

```tsx
// apps/<app>/src/shapes/usersTable.tsx
export default Shape((ui, { zod }) => ({
  schema: Entities.User.schema,
  as: ui.DataTable,           // Tables.DataTable будет global через ADR 033
}), (ui, props) => ({
  columns: [
    { accessorKey: 'id',    header: 'ID' },
    { accessorKey: 'email', header: 'Email' },
  ],
  infinite: { mode: 'plain' },
}));

// apps/<app>/src/widgets/users-list.tsx
export default Widget((Ui) => (
  <Shapes.UsersTable data={ctx.store.ctx.users} />
));
```

## Subpath exports

- `.` (root) — high-level composite (`DataTable`) + types (`IDataTableProps<TRow>`, `IColumn<TRow>`).
- `/capsule` — `defineCapsuleModule` manifest (ADR 033 регистрация `Tables.*`).
- _(future)_ `/primitives` — raw `Table.Root` / `Table.Head` / `Table.Body` / `Table.Row` / `Table.Cell`.
- _(future)_ `/lib` — headless `createInfiniteScroll` / `createPagination`.

## Docs

- AI-anchor: [`docs/_meta/web-table.md`](../../../docs/_meta/web-table.md) _(будет переименован)_
- Shape redesign + table founding: [`docs/_meta/shape-v2-and-table.md`](../../../docs/_meta/shape-v2-and-table.md)
- Zone canon: [`docs/_meta/web-zones/boost.md`](../../../docs/_meta/web-zones/boost.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- ADR 036 (Shape v2 + HKT), ADR 044 (heavy=pkg / light=kit), ADR 046 D1 (boost-* namespace), ADR 047 D1.
