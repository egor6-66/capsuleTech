/**
 * World map Widget — карта для footer'а workspace.
 *
 * Центр — Санкт-Петербург, slight pitch для горизонта (Sky atmosphere visible).
 * Из 3D-набора активен только Sky (offline-safe). BuildingsPreset/TerrainPreset
 * требуют user-supplied source/DEM (см. JSDoc этих компонентов).
 *
 * Маркеры: items читаются из Feature.Incidents store (2-й арг фабрики) и
 * подаются в stateless Views.MarkersList через props. Реактивный list-rendering
 * через Solid <For> живёт внутри Views.MarkersList.
 *
 * Loader (2-й колбэк): пока `store.loading === true` Widget рисует map-скелетон
 * вместо MapView. <Show> в WidgetWrapper не монтирует контент-ветку под лоадером,
 * поэтому тяжёлый MapLibre-инстанс НЕ создаётся раньше времени (без мигания tiles).
 */
import type { IIncidentsContext } from '../../features/incidents';

const World = Widget(
  (Ui, store) => {
    const data = () => store?.ctx.data as IIncidentsContext | undefined;
    // Камера подлетает к маркеру выбранного incident'а (flyTo — анимация, в
    // отличие от center=jump) при одном из opt-in условий:
    //   • flyToSelected + выбор из ТАБЛИЦЫ → «Синк с таблицей» (cross-widget)
    //   • flyOnClick    + выбор из КАРТЫ   → «Подлететь к выбранному» (self)
    const flyTo = (): [number, number] | undefined => {
      const sel = data()?.selected;
      if (!sel) return undefined;
      const src = data()?.selectionSource;
      const shouldFly =
        (data()?.flyToSelected && src !== 'map') || (data()?.flyOnClick && src === 'map');
      return shouldFly ? [sel.location.lng, sel.location.lat] : undefined;
    };
    return (
      <Ui.MapView
        center={[30.3158, 59.9311]}
        zoom={13}
        flyTo={flyTo()}
        // pitch={45}
        // bearing={-20}
        // class="h-full w-full"
      >
        {/*<Ui.MapView.Sky />*/}
        <Views.MarkersList items={data()?.items ?? []} activeId={data()?.selected?.id} />
      </Ui.MapView>
    );
  },
  (Ui) => <Ui.Skeleton variant="map" />,
);

export default World;
