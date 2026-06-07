/**
 * IncidentPreview — Shape для single-item preview карточки происшествия.
 *
 * Двухфазная форма (ADR 036):
 *  - bind: schema (`Entities.Incident.schema`, single object) + контейнер `ui.PreviewCard`.
 *  - config: presentation (fields/emptyMessage/flat). `PreviewCard` не несёт
 *    `__tpl` маркер → row в `accessorFn` аннотируется вручную (fallback).
 *
 * Consumer wiring — Widget просто отдаёт `data`; card-chrome и placeholder
 * рисует сам `PreviewCard`:
 * ```tsx
 * <Shapes.IncidentPreview data={selectedIncident()} />
 * ```
 */
const IncidentPreview = Shape(
  (ui) => ({
    schema: Entities.Incident.schema,
    as: ui.PreviewCard,
  }),
  (ui, props) => ({
    emptyMessage: 'Выберите карточку на карте или в таблице',
    flat: true,
    fields: [
      { accessorKey: 'id', header: 'ID' },
      {
        accessorFn: (row) => row.applicant.phone,
        header: 'Заявитель',
        id: 'applicantName',
      },
      {
        accessorFn: (row) => row.applicant.phone,
        header: 'Телефон',
        id: 'applicantPhone',
      },
      {
        accessorFn: (row) => `${row.location.lat}, ${row.location.lng}`,
        header: 'Координаты',
        id: 'location',
      },
      { accessorKey: 'description', header: 'Описание' },
      {
        accessorKey: 'createdAt',
        header: 'Создано',
        cell: (info: { getValue: () => unknown }) =>
          new Date(String(info.getValue())).toLocaleString('ru-RU'),
      },
    ],
  }),
);

export default IncidentPreview;
