/**
 * World map Widget — ВРЕМЕННО ОТКЛЮЧЁН.
 *
 * Карта (`Ui.MapView`) убрана из UI-kit по ADR 033: опциональные пакеты
 * (`@capsuletech/web-map`) больше не сидят в `Ui`, а регистрируются декларацией
 * `packages: [...]` в `capsule.app.ts` и приходят глобалом `Maps.*`.
 *
 * Полноценный возврат карты + интеракция маркеров — после ADR 032 фаза 4
 * (meta-aware emit в `@capsuletech/web-map/controllers`). Тогда восстановить
 * тело из блока ниже, заменив `Ui.MapView` → `Maps.View`, `Ui.MapView.Sky` →
 * `Maps.Sky`, `Ui.MapView.Marker` → `Maps.Marker` (+ emit через package-controller).
 */

const World = Widget((Ui) => (
  <Ui.Layout.Flex class="h-full items-center justify-center text-sm opacity-60">
    Карта временно отключена (ADR 033 — ждёт package-контроллеров, ADR 032 ф.4)
  </Ui.Layout.Flex>
));

export default World;

/* === ОРИГИНАЛ — восстановить после ADR 032 фаза 4 ===
import type { IIncidentsContext } from '../../features/incidents';

const World = Widget(
  (Ui, store) => {
    const data = () => store?.ctx.data as IIncidentsContext | undefined;
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
