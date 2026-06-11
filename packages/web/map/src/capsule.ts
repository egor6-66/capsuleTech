/**
 * @capsuletech/boost-map/capsule
 *
 * Манифест пакета для механизма регистрации опциональных пакетов (ADR 033).
 *
 * Позволяет подключить web-map одной строкой в `capsule.app.ts`:
 * ```ts
 * packages: ['@capsuletech/boost-map']
 * ```
 * После этого глобал `Maps.*` доступен во всех слоях без явных импортов.
 *
 * **Namespace:** `Maps` (НЕ `Map` — `Map` коллидит со встроенным JS `Map`,
 * что приводит к TS2451 «Cannot redeclare block-scoped variable» и разрешению
 * `Map.View` в `MapConstructor`. См. ADR 033 §5.)
 *
 * **Состав `components`:**
 * - `View`            → `MapView`     — корневой компонент карты
 * - `Source`          → `Source`      — источник данных (GeoJSON, tiles, …)
 * - `Layer`           → `Layer`       — слой визуализации
 * - `Marker`          → `Marker`      — HTML-маркер на карте
 * - `Terrain`         → `Terrain`     — 3D-рельеф (требует raster-dem source)
 * - `Sky`             → `Sky`         — атмосферный sky-слой
 * - `TerrainPreset`   → `TerrainPreset`  — preset: raster-dem Source + Terrain в одном
 * - `BuildingsPreset` → `BuildingsPreset` — preset: 3D-здания из vector tiles
 *
 * **Пресеты включены**, т.к. `TerrainPreset` и `BuildingsPreset` — полноценные
 * JSX-компоненты (возвращают JSX-разметку), используются как `<Maps.TerrainPreset/>`
 * и `<Maps.BuildingsPreset/>`. Не включены: `useMap` (hook, не компонент),
 * `MapContext` (Context-объект), `POSITRON`/`DARK_MATTER` (строковые константы) —
 * эти символы остаются в дефолтном экспорте и доступны через явный импорт.
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';

import { BuildingsPreset } from './BuildingsPreset';
import { Layer } from './Layer';
import { MapView } from './MapView';
import { Marker } from './Marker';
import { Sky } from './Sky';
import { Source } from './Source';
import { Terrain } from './Terrain';
import { TerrainPreset } from './TerrainPreset';

export default defineCapsuleModule({
  name: 'Maps',
  components: {
    View: MapView,
    Source,
    Layer,
    Marker,
    Terrain,
    Sky,
    TerrainPreset,
    BuildingsPreset,
  },
});
