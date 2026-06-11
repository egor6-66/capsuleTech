/**
 * @capsuletech/boost-table/controllers — HCA integration layer (ADR 032).
 *
 * Единственный subpath, который зависит от `@capsuletech/web-core`.
 * Содержит emit-проводку событий строк DataTable через `useEmit`.
 *
 * Текущие блоки:
 *  - DataTableController — прозрачная emit-проводка Tables.DataTable (ADR 032):
 *    row click → emit('onRowClick', { source, payload }) → родительская Feature аппа.
 *
 * Пример подключения:
 * ```tsx
 * const ShowIncidents = Feature<Tables.DataTable.Events>((services) => ({
 *   context: { selectedId: null as string | null },
 *   onRowClick: ({ target }) => {
 *     services.store.update({ selectedId: target.payload?.id as string });
 *   },
 * }));
 * // <Features.ShowIncidents>
 * //   <Tables.DataTable
 * //     data={data()} columns={columns}
 * //     itemMeta={(row) => ({ tags: ['incident', 'row'] })}
 * //     itemPayload={(row) => ({ id: row.id })}
 * //   />
 * // </Features.ShowIncidents>
 * ```
 */

export type { IDataTableEvents, IDataTableRowTarget } from './interfaces';
export { DataTableController } from './dataTableController';
