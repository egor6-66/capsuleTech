/**
 * World map Widget — карта для footer'а workspace.
 *
 * Центр — Санкт-Петербург, slight pitch для горизонта (Sky atmosphere visible).
 * Из 3D-набора активен только Sky (offline-safe). BuildingsPreset/TerrainPreset
 * требуют user-supplied source/DEM (см. JSDoc этих компонентов).
 *
 * Маркеры — 200 моков из INCIDENTS_MOCK (точки в bounding-box СПб). Click на
 * маркере возвращает full объект IIncidentMock + MouseEvent. Это временный
 * вариант синхронизации с Tables.Incidents — в следующей итерации общие данные
 * вынесем в global store (Features.Incidents) и подключим обе плоскости (карту
 * и таблицу) к одному источнику.
 */
import { type IIncidentMock, INCIDENTS_MOCK } from '../../mocks/incidents';

const World = Widget((Ui) => (
  <Ui.MapView
    center={[30.3158, 59.9311]}
    zoom={13}
    pitch={45}
    bearing={-20}
    class="h-full w-full"
  >
    <Ui.MapView.Sky />
    {INCIDENTS_MOCK.map((incident: IIncidentMock) => (
      <Ui.MapView.Marker
        lng={incident.location.lng}
        lat={incident.location.lat}
        onClick={() => {
          // TODO(Phase 2): controller.markerClicked(incident.id) → Features.Incidents.selectOne
          console.log('[Marker click]', incident.id, incident.description, incident.location);
        }}
      />
    ))}
  </Ui.MapView>
));

export default World;
