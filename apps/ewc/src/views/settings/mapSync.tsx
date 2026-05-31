/**
 * MapSync — контрол в settings-strip карты: подлетать ли к выбранному инциденту.
 *
 * Stateless-проекция: текущее значение `flyToSelected` читается из стора через
 * `useCtx`, клик по кнопке несёт meta-тег `toggle-fly` → роутится в
 * `Features.Incidents.onClick`, который флипает флаг. Сам View ничего не мутирует.
 */
import type { IIncidentsContext } from '../../features/incidents';

const MapSync = View((Ui) => {
  const ctx = useCtx();
  const on = () => !!(ctx.store.ctx.data as IIncidentsContext | undefined)?.flyToSelected;
  return (
    <Ui.Button size="sm" variant={on() ? 'default' : 'outline'} meta={{ tags: ['toggle-fly'] }}>
      {on() ? '✓ Подлетать к выбранному' : 'Подлетать к выбранному'}
    </Ui.Button>
  );
});

export default MapSync;
