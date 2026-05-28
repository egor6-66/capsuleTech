import { INCIDENTS_MOCK } from '../mocks/incidents';

/**
 * IncidentsTable — батч-вид списка карточек происшествий через Ui.DataTable.
 *
 * Schema: `z.array(Entities.Incident.schema)` — batch-list поверх per-item Entity.
 * Defaults: 200 mock-карточек (apps/ewc/src/mocks/incidents.ts) — заменятся
 *   реальным списком когда подключим services.api.incidents.list() (Phase 2).
 * Template: ui.DataTable (composite с sorting + infinite scroll).
 *
 * Extras (columns/sorting/infinite) транзитно идут в DataTable.
 */
const IncidentsTable = Shape((z, ui) => ({
  schema: z.array(Entities.Incident.schema),
  defaults: INCIDENTS_MOCK,
  as: ui.DataTable,
  sorting: true,
  infinite: { itemHeight: 40 },
  columns: [
    { accessorKey: 'id', header: 'ID' },
    {
      header: 'Заявитель',
      accessorFn: (row: (typeof INCIDENTS_MOCK)[number]) => row.applicant.name,
      id: 'applicantName',
    },
    {
      header: 'Телефон',
      accessorFn: (row: (typeof INCIDENTS_MOCK)[number]) => row.applicant.phone,
      id: 'applicantPhone',
    },
    {
      header: 'Координаты',
      id: 'location',
      accessorFn: (row: (typeof INCIDENTS_MOCK)[number]) =>
        `${row.location.lat}, ${row.location.lng}`,
    },
    { accessorKey: 'description', header: 'Описание' },
    {
      accessorKey: 'createdAt',
      header: 'Создано',
      cell: (info: { getValue: () => unknown }) =>
        new Date(String(info.getValue())).toLocaleString('ru-RU'),
    },
  ],
}));

export default IncidentsTable;
