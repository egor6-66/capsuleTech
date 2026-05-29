/**
 * IncidentPreview — Shape для single-item preview карточки происшествия.
 *
 * Schema: `Entities.Incident.schema` (single object — Shape runtime принимает
 * любой schema, не только array).
 * Template: `ui.PreviewCard` (composite — рендерит field-блоки label + value).
 * Fields: parallel to columns в IncidentsTable — те же accessor patterns.
 *
 * Consumer wiring:
 * ```tsx
 * <Ui.Card.Content>
 *   <Shapes.IncidentPreview data={selectedIncident()} />
 * </Ui.Card.Content>
 * ```
 *
 * При `data=null/undefined` PreviewCard рендерит `emptyMessage` automatically.
 */
const IncidentPreview = Shape((_z, ui) => ({
  schema: Entities.Incident.schema,
  as: ui.PreviewCard,
  emptyMessage: 'Выберите карточку на карте или в таблице',
  fields: [
    { accessorKey: 'id', header: 'ID' },
    {
      accessorFn: (row: { applicant: { name: string } }) => row.applicant.name,
      header: 'Заявитель',
      id: 'applicantName',
    },
    {
      accessorFn: (row: { applicant: { phone: string } }) => row.applicant.phone,
      header: 'Телефон',
      id: 'applicantPhone',
    },
    {
      accessorFn: (row: { location: { lat: number; lng: number } }) =>
        `${row.location.lat}, ${row.location.lng}`,
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
}));

export default IncidentPreview;
