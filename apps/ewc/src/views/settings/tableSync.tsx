/**
 * TableSync — контрол в settings-strip таблицы: скроллить ли к выбранному инциденту.
 *
 * Симметрично MapSync: значение `scrollToSelected` читается из стора через
 * `useCtx`, клик несёт meta-тег `toggle-scroll` → `Features.Incidents.onClick`
 * флипает флаг. View ничего не мутирует сам.
 */
import type { IIncidentsContext } from '../../features/incidents';

const TableSync = View((Ui) => {
  const ctx = useCtx();
  const on = () => !!(ctx.store.ctx.data as IIncidentsContext | undefined)?.scrollToSelected;
  return (
    <Ui.Button size="sm" variant={on() ? 'default' : 'outline'} meta={{ tags: ['toggle-scroll'] }}>
      {on() ? '✓ Скроллить к выбранному' : 'Скроллить к выбранному'}
    </Ui.Button>
  );
});

export default TableSync;
