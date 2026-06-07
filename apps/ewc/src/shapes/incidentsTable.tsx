/**
 * IncidentsTable — батч-вид списка карточек происшествий через Tables.DataTable.
 *
 * Двухфазная форма (ADR 036):
 *  - bind: schema (`Zod.array(Entities.Incident.schema)`) + контейнер `Tables.DataTable`.
 *  - config: row-зависимая презентация (columns/sorting/infinite/defaults).
 *    `row` в `accessorFn` типизируется автоматически из `__tpl` маркера
 *    `Tables.DataTable` — без ручных аннотаций.
 *
 * Defaults: `Entities.Incident.mock` (200 dev-карточек; в prod-сборке `[]`).
 * Заменяются реальным списком когда подключим `services.api.incidents.list()`.
 */
const IncidentsTable = Shape(
  () => ({
    schema: Zod.array(Entities.Incident.schema),
    as: Tables.DataTable,
  }),
  {
    defaults: Entities.Incident.mock,
    sorting: true,
    // plain (non-virtual) infinite — надёжно рендерит все подгруженные строки.
    // virtual-режим пока с cold-empty quirk'ом (backlog owner-web-table).
    infinite: { itemHeight: 40, mode: 'plain' },
    columns: [
      { accessorKey: 'id', header: 'ID' },
      { header: 'Заявитель', id: 'applicantName', accessorFn: (row) => row.applicant.name },
      { header: 'Телефон', id: 'applicantPhone', accessorFn: (row) => row.applicant.phone },
      {
        header: 'Координаты',
        id: 'location',
        accessorFn: (row) => `${row.location.lat}, ${row.location.lng}`,
      },
      { accessorKey: 'description', header: 'Описание' },
      {
        accessorKey: 'createdAt',
        header: 'Создано',
        cell: (info: { getValue: () => unknown }) =>
          new Date(String(info.getValue())).toLocaleString('ru-RU'),
      },
    ],
  },
);

export default IncidentsTable;
