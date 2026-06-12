// Map namespace (augmentation-ready per ADR 046 Decision 5).
// Kit provides Ui.Map.View (light placeholder). boost-map augments
// the namespace with View (heavy), 3D, Marker, Sky, Source, Layer etc.
//
// Single user-facing API path Ui.Map.* — consumers don't need to know
// whether a member came from kit or boost. Module augmentation declares
// extra members type-side; runtime augmentation via ADR 033 capsule.ts.

import { MapView } from './map';

export const Map = {
  View: MapView,
};

export type * from './interfaces';
