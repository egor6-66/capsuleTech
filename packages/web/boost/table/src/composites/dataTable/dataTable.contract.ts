import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

/**
 * DataTable contract — etalon F1 dogfood for the web-contract protocol.
 *
 * Covers the data + events surface of the DataTable composite so that
 * data-editors and event monitors can discover its bindable shape and
 * traceable events without reading source.
 *
 * data  — rows are row-generic at runtime; the descriptor exposes the
 *         structural shape a consumer provides (array of record).
 * events — the three HCA events DataTableController emits (ADR 032):
 *          onRowClick / onRowDblClick / onRowSelect.
 * props  — the configurable, non-generic props that a config-editor
 *          can meaningfully validate (z imported from @capsuletech/shared-zod).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Rows are row-generic — describe the structural contract as a permissive
// Zod shape: an array of record objects.  Shape<TRow> inference is handled
// at the HKT layer (ADR 036); this descriptor is for tooling / data-editor.
const dataShape = z.array(z.record(z.string(), z.unknown()));

// Configurable, non-generic props.  Covers the boolean/enum knobs a
// config-editor should surface; omits row-generic callbacks and JSX slots.
const propsSchema = z.object({
  sorting: z.boolean().optional(),
  selection: z.boolean().optional(),
  filtering: z.boolean().optional(),
  pagination: z
    .union([z.boolean(), z.object({ pageSize: z.number().int().positive().optional() })])
    .optional(),
  infinite: z
    .union([
      z.boolean(),
      z.object({
        itemHeight: z.number().positive().optional(),
        overscan: z.number().int().nonnegative().optional(),
        threshold: z.number().int().nonnegative().optional(),
        mode: z.enum(['virtual', 'plain']).optional(),
      }),
    ])
    .optional(),
  emptyMessage: z.string().optional(),
  class: z.string().optional(),
});

export const DataTableContract = defineContract({ name: 'DataTable', kind: 'widget' }, [
  rule.data(dataShape),

  rule.events(['onRowClick', 'onRowDblClick', 'onRowSelect']),

  rule.props(propsSchema),

  rule.styleSlots(['root', 'header', 'body', 'row', 'cell', 'toolbar', 'pagination']),

  rule.examples([
    {
      name: 'basic',
      props: {
        columns: [
          { accessorKey: 'id', header: 'ID' },
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'status', header: 'Status' },
        ],
        data: [
          { id: 1, name: 'Alice', status: 'active' },
          { id: 2, name: 'Bob', status: 'inactive' },
          { id: 3, name: 'Carol', status: 'active' },
        ],
        sorting: true,
      },
    },
    {
      name: 'infinite-plain',
      props: {
        columns: [
          { accessorKey: 'id', header: 'ID' },
          { accessorKey: 'title', header: 'Title' },
        ],
        data: [
          { id: 1, title: 'Item one' },
          { id: 2, title: 'Item two' },
        ],
        infinite: { mode: 'plain', threshold: 5 },
      },
    },
  ]),
]);
