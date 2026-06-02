/**
 * Incidents table Widget — рендер через Shape pattern.
 *
 * Данные приходят из родительского `<Features.Incidents>` store (2-й арг
 * Widget-фабрики). Shape отвечает за columns + sorting; Widget подаёт live
 * data из `store.ctx.data.items`.
 *
 * События: per-row `itemMeta`/`itemPayload` навешивают tags+payload на строки.
 * Клик по строке → web-core биндит событие, универсальный `Feature.onClick`
 * роутит по `target.meta.tags` (incident → select). Никаких прямых колбэков.
 *
 * Подсветка активной строки: `isRowActive` сравнивает row.id с выбранным
 * incident'ом из store. Реактивность highlight'а — ответственность DataTable.
 *
 * Loader (2-й колбэк): пока `store.loading === true` Widget рисует table-скелетон
 * вместо контента. Presentation лоадера живёт здесь — фича знает только про
 * логический сигнал загрузки, не про вид скелетона.
 */
import type { IIncident, IIncidentsContext } from '../../features/incidents';

const Incidents = Widget(
  (_Ui, store) => {
    const data = () => store?.ctx.data as IIncidentsContext | undefined;
    return (
      <Shapes.IncidentsTable
        data={data()?.items ?? []}
        itemMeta={() => ({ tags: ['incident', 'table'] })}
        itemPayload={(row: IIncident) => ({ id: row.id })}
        isRowActive={(row: IIncident) => row.id === data()?.selected?.id}
        getRowId={(row: IIncident) => row.id}
        // Центрируем строку при одном из opt-in условий (DataTable scrollToId
        // делает scrollIntoView block:'center'):
        //   • scrollToSelected + выбор из КАРТЫ  → «Синк с картой» (cross-widget)
        //   • centerOnClick    + выбор из ТАБЛИЦЫ → «Скроллить к выбранному» (self)
        scrollToId={
          (data()?.scrollToSelected && data()?.selectionSource !== 'table') ||
          (data()?.centerOnClick && data()?.selectionSource === 'table')
            ? data()?.selected?.id
            : undefined
        }
      />
    );
  },
  (Ui) => <Ui.Skeleton variant="table" rows={100} />,
);

export default Incidents;
