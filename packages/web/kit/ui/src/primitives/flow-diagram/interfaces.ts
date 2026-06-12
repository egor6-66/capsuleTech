import type { JSX } from 'solid-js';

/**
 * Props for Ui.FlowDiagram — light placeholder for the
 * `@capsuletech/boost-flow` heavy mirror.
 *
 * Boost-flow tянет XYFlow / solid-flow runtime (10+ kB minified). This
 * placeholder ships zero engine deps and renders a static node-canvas
 * graphic, suitable for landing previews / studio palette / pre-mount
 * skeleton.
 *
 * Naming: `Ui.FlowDiagram` (NOT `Ui.Flow`) — `Ui.Flow.*` namespace is
 * reserved for Solid control-flow (For/Show/Switch/Match/Index/Dynamic)
 * injected by web-core. The placeholder is a sibling concept under
 * "Flow" as canvas-flow, named explicitly to avoid ambiguity.
 *
 * Canon: docs/_meta/web-zones/kit.md + ADR 044 + ADR 046 D3.
 */
export interface IUiFlowDiagramProps {
  size?: 'sm' | 'md' | 'lg' | 'full';
  class?: string;
  ariaLabel?: string;
  children?: JSX.Element;
}
