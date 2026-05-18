import type { Map as MaplibreMap } from 'maplibre-gl';
import { type Accessor, createContext, useContext } from 'solid-js';

export interface IMapContext {
  /** Реактивный getter: undefined пока карта не примонтирована. */
  map: Accessor<MaplibreMap | undefined>;
}

export const MapContext = createContext<IMapContext>();

/**
 * Доступ к instance MapLibre из дочерних слоёв. Возвращает реактивный getter:
 * до полной инициализации карты значение — undefined.
 */
export const useMap = (): IMapContext => {
  const ctx = useContext(MapContext);
  if (!ctx) {
    throw new Error('[@capsuletech/web-map] useMap() must be called inside <MapView>');
  }
  return ctx;
};
