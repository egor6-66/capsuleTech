/**
 * World map Widget — ВРЕМЕННО ОТКЛЮЧЁН.
 *
 * Карта (`Ui.MapView`) убрана из UI-kit по ADR 033: опциональные пакеты
 * (`@capsuletech/boost-map`) больше не сидят в `Ui`, а регистрируются декларацией
 * `packages: [...]` в `capsule.app.ts` и приходят глобалом `Maps.*`.
 *
 * Полноценный возврат карты + интеракция маркеров — после ADR 032 фаза 4
 * (meta-aware emit в `@capsuletech/boost-map/controllers`). Тогда восстановить
 * тело из блока ниже, заменив `Ui.MapView` → `Maps.View`, `Ui.MapView.Sky` →
 * `Maps.Sky`, `Ui.MapView.Marker` → `Maps.Marker` (+ emit через package-controller).
 */

const World = Widget(
  (Ui) => (
    <Ui.Layout.Flex class="h-full items-center justify-center text-sm opacity-60">
      Карта временно отключена (ADR 033 — ждёт package-контроллеров, ADR 032 ф.4)
    </Ui.Layout.Flex>
  ),
  {
    // Декларативные настройки карты — рендерятся в settings-strip при settingsMode.
    //   «Синк с таблицей»       — карта подлетает к выбору ИЗ ТАБЛИЦЫ (cross-widget).
    //   «Подлететь к выбранному» — клик по маркеру подлетает к нему (self).
    settings: [
      {
        type: 'toggle',
        label: 'Синк с таблицей',
        value: (d) => d.flyToSelected,
        tags: ['toggle-fly'],
      },
      {
        type: 'toggle',
        label: 'Подлететь к выбранному',
        value: (d) => d.flyOnClick,
        tags: ['toggle-fly-self'],
      },
    ],
  },
);

export default World;

/* === ОРИГИНАЛ — восстановить после ADR 032 фаза 4 ===
const World = Widget(
  (Ui, store: StoreOf<typeof Features.Incidents>) => {
    const data = () => store.ctx.data;
    const flyTo = (): [number, number] | undefined => {
      const sel = data()?.selected;
      if (!sel) return undefined;
      const src = data()?.selectionSource;
      const shouldFly =
        (data()?.flyToSelected && src !== 'map') || (data()?.flyOnClick && src === 'map');
      return shouldFly ? [sel.location.lng, sel.location.lat] : undefined;
    };
    return (
      <Ui.MapView center={[30.3158, 59.9311]} zoom={13} flyTo={flyTo()}>
        <Views.MarkersList items={data()?.items ?? []} activeId={data()?.selected?.id} />
      </Ui.MapView>
    );
  },
  (Ui) => <Ui.Skeleton variant="map" />,
);

export default World;
*/
