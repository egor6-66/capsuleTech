/**
 * MarkersList — ВРЕМЕННО ОТКЛЮЧЁН.
 *
 * Рендерил маркеры через `Ui.MapView.Marker`, который убран из UI-kit по ADR 033
 * (карта переезжает в глобал `Maps.*` через `capsule.app.ts: packages`).
 * Восстановить после ADR 032 фаза 4: `Ui.MapView.Marker` → `Maps.Marker`,
 * клик — через package-контроллер web-map (meta-aware emit), а не UiProxy.
 */

const MarkersList = View(() => null);

export default MarkersList;

/* === ОРИГИНАЛ — восстановить после ADR 032 фаза 4 ===
import { For } from 'solid-js';
import type { IIncident } from '../features/incidents';

const MarkersList = View((Ui, props: { items?: IIncident[]; activeId?: string }) => (
  <For each={props.items ?? []}>
    {(incident: IIncident) => (
      <Ui.MapView.Marker
        lng={incident.location.lng}
        lat={incident.location.lat}
        active={incident.id === props.activeId}
        meta={{ tags: ['incident', 'map'] }}
        payload={{ id: incident.id }}
      />
    )}
  </For>
));

export default MarkersList;
*/
