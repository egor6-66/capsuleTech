/**
 * TableSync — контролы в settings-strip таблицы. Две независимые opt-in-кнопки:
 *
 *   «Синк с картой»        (tag `toggle-scroll`, флаг `scrollToSelected`) —
 *     cross-widget: таблица скроллит+центрирует выбор, пришедший ИЗ КАРТЫ.
 *   «Скроллить к выбранному» (tag `toggle-center`, флаг `centerOnClick`) —
 *     self: клик по строке центрирует её в таблице.
 *
 * Stateless-проекция: значения читаются из стора через `useCtx`, клик несёт
 * meta-тег → `Features.Incidents.onClick` флипает флаг. View ничего не мутирует.
 */
const TableSync = View((Ui) => {
  const ctx = useCtx();
  const data = () => ctx.store.ctx.data as CtxOf<typeof Features.Incidents> | undefined;
  const sync = () => !!data()?.scrollToSelected;
  const center = () => !!data()?.centerOnClick;
  return (
    <>
      <Ui.Button
        size="sm"
        variant={sync() ? 'default' : 'outline'}
        meta={{ tags: ['toggle-scroll'] }}
      >
        {sync() ? '✓ Синк с картой' : 'Синк с картой'}
      </Ui.Button>
      <Ui.Button
        size="sm"
        variant={center() ? 'default' : 'outline'}
        meta={{ tags: ['toggle-center'] }}
      >
        {center() ? '✓ Скроллить к выбранному' : 'Скроллить к выбранному'}
      </Ui.Button>
    </>
  );
});

export default TableSync;
