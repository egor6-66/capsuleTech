# @capsuletech/web-map

MapLibre GL + Solid.js. Низкоуровневый пакет карты для capsule.

## Статус

Iteration 0 — скелет. Экспортирует `<MapView>` (mount/dispose MapLibre на div) и `useMap()` для доступа к instance из дочерних слоёв.

## Стек

- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) — движок (vector tiles, GPU, 3D-terrain)
- Solid.js — реактивный layer

## Использование

```tsx
import { MapView } from '@capsuletech/web-map';
import 'maplibre-gl/dist/maplibre-gl.css';

<MapView
  style="https://demotiles.maplibre.org/style.json"
  center={[37.61, 55.75]}
  zoom={10}
/>
```

## Roadmap

Полный план — отдельная ADR (`docs/01-architecture/adr/`, TBD).

- [x] Iter 0 — пакет + `MapView` + `useMap()`
- [ ] Iter 1 — layers API (`<RasterLayer>`, `<VectorLayer>`, `<GeoJSONLayer>`)
- [ ] Iter 2 — markers / custom HTML symbols (Solid-render через `render(() => ..., el)`)
- [ ] Iter 3 — measurement / route tools
- [ ] Iter 4 — clusters + spiderfier
