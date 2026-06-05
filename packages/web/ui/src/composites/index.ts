/**
 * Stateless structural composites — arrange primitives, emit events, hold no
 * store. Connected controls (mode toggles, theme picker) moved to
 * `@capsuletech/web-shell` (tier-2). `compositeProxy` is internal events-context
 * glue consumed by `@capsuletech/web-core`, not a composite itself.
 */
export * from './compositeProxy';
export * from './dataTable';
export * from './dropdownMenu';
export * from './previewCard';
