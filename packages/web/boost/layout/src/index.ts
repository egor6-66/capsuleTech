// @capsuletech/boost-layout — heavy Layout booster per ADR 046 (amended 2026-06-12).
//
// Augments the kit Ui.Layout namespace (kit ships { Flex, Grid }) with heavy
// layout variants. Matrix arrived in Phase B2; future: Bento, Dock, Masonry, …
//
// Programmatic axis — `Layouts.*` namespace via ADR 033 capsule.ts registration,
// for controller/feature consumers (e.g. `Layouts.Matrix` HCA component).

export type * as IMatrix from './matrix/interfaces';
export type { IMatrixEvents } from './matrix/interfaces';
export { Matrix } from './matrix/matrix';
export { appShellResolver, resolvePreset } from './matrix/presets';
export type { INormalizedSlot } from './matrix/utils';
export { normalizeSlotValue } from './matrix/utils';
