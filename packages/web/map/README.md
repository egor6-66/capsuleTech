# @capsuletech/web-map

MapLibre GL + Solid wrapper для capsule: Source / Layer / Terrain / Sky + TerrainPreset / BuildingsPreset. Прямая интеграция с `maplibre-gl` без промежуточных обёрток.  ·  zone: **boost**  ·  status: **alpha (0.0.1)**

Light-mirror — `Ui.Map` placeholder в kit (после Phase B6-placeholder). Регистрируется как `Maps.*` global через ADR 033.

> **Будет переименован в `@capsuletech/boost-map`** в Phase W6 ([[web-rework-plan]] / ADR 046 D1).

## Install

```bash
pnpm add @capsuletech/web-map
# peer deps:
pnpm add solid-js @capsuletech/web-core
```

## Minimum usage

```tsx
import { MapView, Source, Layer } from '@capsuletech/web-map';
import 'maplibre-gl/dist/maplibre-gl.css';

const App = () => (
  <MapView
    style="https://demotiles.maplibre.org/style.json"
    center={[37.61, 55.75]}
    zoom={10}
  >
    <Source id="my-data" type="geojson" data={geojson}>
      <Layer id="points" type="circle" paint={{ 'circle-radius': 6 }} />
    </Source>
  </MapView>
);
```

`useMap()` доступен для дочерних компонентов — прямой доступ к MapLibre instance.

## Stack

- [MapLibre GL JS 5](https://maplibre.org/maplibre-gl-js/docs/) — движок (vector tiles, GPU, 3D-terrain).
- Solid.js — реактивный layer (mount/dispose lifecycle + reactive prop sync).

## Subpath exports

- `.` (root) — `MapView`, `useMap`, `Source`, `Layer`, `Terrain`, `Sky`, presets (TerrainPreset, BuildingsPreset).
- `/capsule` — `defineCapsuleModule` manifest (ADR 033 регистрация `Maps.*`).

## Docs

- AI-anchor: [`docs/_meta/web-map.md`](../../../docs/_meta/web-map.md)
- Zone canon: [`docs/_meta/web-zones/boost.md`](../../../docs/_meta/web-zones/boost.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- ADR 044 (heavy=pkg / light=kit), ADR 046 D1 (boost-* namespace), ADR 047 D1.
