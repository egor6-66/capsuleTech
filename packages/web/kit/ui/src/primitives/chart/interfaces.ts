import type { JSX } from 'solid-js';

/**
 * Props for Ui.Chart — light placeholder for the
 * `@capsuletech/boost-chart` heavy mirror.
 *
 * Boost-charts pulls Chart.js (40+ kB minified). This placeholder ships
 * zero engine deps and renders a static bar-chart glyph, suitable for
 * dashboards / landing previews / pre-mount skeletons.
 *
 * Canon: docs/_meta/web-zones/kit.md + ADR 044 + ADR 046 D3.
 */
export interface IUiChartProps {
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Visual style of the placeholder glyph. Default: 'bar'. */
  variant?: 'bar' | 'line';
  class?: string;
  ariaLabel?: string;
  children?: JSX.Element;
}
