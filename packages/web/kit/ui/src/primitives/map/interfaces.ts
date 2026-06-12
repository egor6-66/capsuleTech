import type { JSX } from 'solid-js';

/**
 * Props for Ui.Map — light placeholder for the `@capsuletech/boost-map` heavy mirror.
 *
 * Boost-map (MapLibre GL) is a 100+ kB pull. This placeholder ships zero
 * engine deps and renders a frosted-rect with a static map glyph, suitable for:
 *   - landing pages where map preview shouldn't load MapLibre,
 *   - skeleton states before boost-map mounts,
 *   - app-shell previews in studio palette.
 *
 * Props are a strict subset of `boost-map/MapView` so migration is "swap import".
 * Heavy props (center / zoom / style / sources / etc.) are NOT exposed —
 * if you need them, you need boost-map.
 *
 * Canon: docs/_meta/web-zones/kit.md + ADR 044 + ADR 046 D3.
 */
export interface IUiMapProps {
  /** Aspect/height of the placeholder. */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Optional class. */
  class?: string;
  /** Optional aria-label override. Default: 'Map placeholder'. */
  ariaLabel?: string;
  /** Optional children rendered on top of the placeholder (e.g. CTA / overlay). */
  children?: JSX.Element;
}
