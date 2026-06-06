/**
 * Incidents table widget — рендер через Shape, данные из родительского
 * `Features.Incidents` store (2-й арг фабрики). Per-row `itemMeta`/`itemPayload`
 * вешают tags+payload на строки → клик роутится универсальным `Feature.onClick`
 * (incident → select), без прямых колбэков. Активная строка — по `store.selected`.
 *
 * `loader` (опция) — table-скелетон, пока `store.loading`. `settings` — декларативные
 * тогглы sync/center, рендерятся в settings-strip при settingsMode.
 *
 * `scrollToId` центрирует строку при opt-in: «Синк с картой» (выбор из карты) или
 * «Скроллить к выбранному» (выбор из своей таблицы) — иначе undefined.
 */
type IIncident = Entities.Incident.Row;

const Incidents = Widget<Features.Incidents>(
  (_Ui, store) => {
    const data = () => store.ctx.data;
    return (
      <Shapes.IncidentsTable
        data={data()?.items ?? []}
        itemMeta={() => ({ tags: ['incident', 'table'] })}
        itemPayload={(row: IIncident) => ({ id: row.id })}
        isRowActive={(row: IIncident) => row.id === data()?.selected?.id}
        getRowId={(row: IIncident) => row.id}
        scrollToId={
          (data()?.scrollToSelected && data()?.selectionSource !== 'table') ||
          (data()?.centerOnClick && data()?.selectionSource === 'table')
            ? data()?.selected?.id
            : undefined
        }
      />
    );
  },
  {
    loader: (Ui) => <Ui.Skeleton variant="table" rows={100} />,
    settings: [
      {
        type: 'toggle',
        label: 'Синк с картой',
        value: (d) => d.scrollToSelected,
        tags: ['toggle-scroll'],
      },
      {
        type: 'toggle',
        label: 'Скроллить к выбранному',
        value: (d) => d.centerOnClick,
        tags: ['toggle-center'],
      },
    ],
  },
);

export default Incidents;
