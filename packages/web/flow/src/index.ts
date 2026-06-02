export { Flow, type IFlowProps } from './Flow';
export { FlowPalette, type IFlowPaletteItem, type IFlowPaletteProps } from './FlowPalette';
export { FLOW_NODE_MIME } from './dnd';

// Re-export the solid-flow building blocks consumers need to define custom
// nodes, edges and state — so everything is imported from @capsuletech/web-flow
// and consumers never touch @dschz/solid-flow directly (insulates from its
// alpha API churn — ADR 027).
export {
  type ColorMode,
  createEdgeStore,
  createNodeStore,
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  NodeResizer,
  NodeToolbar,
  useSolidFlow,
} from '@dschz/solid-flow';
