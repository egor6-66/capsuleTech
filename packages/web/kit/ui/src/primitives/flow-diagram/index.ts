// FlowDiagram namespace (augmentation-ready per ADR 046 Decision 5).
// Kit provides Ui.FlowDiagram.Static (light placeholder). boost-flow augments
// the namespace with Reactive, Editor etc.
//
// Naming note: `Ui.FlowDiagram` (NOT `Ui.Flow`) — `Ui.Flow.*` namespace is
// reserved for Solid control-flow primitives (For/Show/Switch/Match/Index/Dynamic);
// see web-core ui-kit/imports.tsx. This is canonical.

import { FlowDiagram as FlowDiagramStatic } from './flowDiagram';

export const FlowDiagram = {
  Static: FlowDiagramStatic,
};

export type * from './interfaces';
