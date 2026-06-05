/**
 * MapSync — контролы в settings-strip карты. Две независимые opt-in-кнопки:
 *
 *   «Синк с таблицей»       (tag `toggle-fly`, флаг `flyToSelected`) —
 *     cross-widget: карта подлетает к выбору, пришедшему ИЗ ТАБЛИЦЫ.
 *   «Подлететь к выбранному» (tag `toggle-fly-self`, флаг `flyOnClick`) —
 *     self: клик по маркеру подлетает к нему.
 *
 * Stateless-проекция: значения читаются из стора через `useCtx`, клик несёт
 * meta-тег → `Features.Incidents.onClick` флипает флаг. View ничего не мутирует.
 */
const MapSync = View((Ui) => {
  const ctx = useCtx();
  const data = () => ctx.store.ctx.data as CtxOf<typeof Features.Incidents> | undefined;
  const sync = () => !!data()?.flyToSelected;
  const fly = () => !!data()?.flyOnClick;
  return (
    <>
      <Ui.Button size="sm" variant={sync() ? 'default' : 'outline'} meta={{ tags: ['toggle-fly'] }}>
        {sync() ? '✓ Синк с таблицей' : 'Синк с таблицей'}
      </Ui.Button>
      <Ui.Button
        size="sm"
        variant={fly() ? 'default' : 'outline'}
        meta={{ tags: ['toggle-fly-self'] }}
      >
        {fly() ? '✓ Подлететь к выбранному' : 'Подлететь к выбранному'}
      </Ui.Button>
    </>
  );
});

export default MapSync;
