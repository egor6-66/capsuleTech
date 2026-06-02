/**
 * dataTransfer MIME carrying a FlowPalette item's node `type` to the Flow pane
 * `onDrop`. HTML5 drag is document-global (not provider-scoped), so a palette
 * and a Flow can live in different containers / Matrix slots and still connect.
 */
export const FLOW_NODE_MIME = 'application/capsule-flow-node';
