import { useDarkMode } from '@capsuletech/web-style';
import {
  Background,
  Controls,
  MiniMap,
  type Node,
  SolidFlow,
  SolidFlowProvider,
  useSolidFlow,
} from '@dschz/solid-flow';
import '@dschz/solid-flow/styles';
import './flow.css';
import { type ComponentProps, type JSX, Show, splitProps } from 'solid-js';
import { FLOW_NODE_MIME } from './dnd';

type SolidFlowProps = ComponentProps<typeof SolidFlow>;
type BackgroundVariant = 'dots' | 'lines' | 'cross';

export interface IFlowProps extends Omit<SolidFlowProps, 'children'> {
  /** Background pattern, or `false` to hide. Default `'dots'`. */
  background?: boolean | BackgroundVariant;
  /** Show zoom / fit controls. Default `true`. */
  controls?: boolean;
  /** Show minimap. Default `true`. */
  minimap?: boolean;
  /** Extra class on the canvas container. */
  class?: string;
  /** Extra children (`<Panel>`, toolbars, …) rendered inside the flow. */
  children?: JSX.Element;
  /**
   * Map a dropped FlowPalette item (its `type`) + flow position → a new node.
   * Enables palette → canvas drop. Omit to disable drop.
   */
  createNode?: (type: string, position: { x: number; y: number }) => Node;
}

/**
 * Flow — themed node-canvas primitive (ADR 027).
 *
 * Wraps `@dschz/solid-flow` with capsule theming (`colorMode` follows the active
 * web-style theme via `useDarkMode`; palette via flow.css `--xy-*` tokens) and
 * sane defaults (dots background, controls, minimap, fitView). Compose anywhere —
 * including as the content of a `Layout.Matrix` cell.
 *
 * Define custom nodes with the re-exported `Handle` / `NodeResizer` / `NodeProps`;
 * build node/edge state with `createNodeStore` / `createEdgeStore`. For drop-to-add,
 * pass `createNode` and place a `<FlowPalette>` nearby.
 */
export const Flow = (props: IFlowProps): JSX.Element => (
  <div class={`cap-flow h-full w-full ${props.class ?? ''}`}>
    <SolidFlowProvider>
      <FlowInner {...props} />
    </SolidFlowProvider>
  </div>
);

const FlowInner = (props: IFlowProps): JSX.Element => {
  const [local, rest] = splitProps(props, [
    'background',
    'controls',
    'minimap',
    'class',
    'children',
    'colorMode',
    'minZoom',
    'maxZoom',
    'fitView',
    'fitViewOptions',
    'createNode',
  ]);

  const isDark = useDarkMode();
  const flow = useSolidFlow();

  const bgVariant = (): BackgroundVariant | null => {
    const b = local.background ?? 'dots';
    if (b === false) return null;
    if (b === true) return 'dots';
    return b;
  };

  const onDragOver = (e: DragEvent): void => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    const type = e.dataTransfer?.getData(FLOW_NODE_MIME);
    if (!type || !local.createNode) return;
    const point = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const node = local.createNode(type, point);
    // Drop the node centered on the cursor (not top-left) by offsetting half its size.
    const w = typeof node.width === 'number' ? node.width : 0;
    const h = typeof node.height === 'number' ? node.height : 0;
    node.position = { x: point.x - w / 2, y: point.y - h / 2 };
    flow.addNodes(node);
  };

  return (
    <SolidFlow
      colorMode={local.colorMode ?? (isDark() ? 'dark' : 'light')}
      minZoom={local.minZoom ?? 0.2}
      maxZoom={local.maxZoom ?? 4}
      fitView={local.fitView ?? true}
      fitViewOptions={local.fitViewOptions ?? { maxZoom: 1 }}
      {...rest}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Show when={bgVariant()}>{(v) => <Background variant={v()} />}</Show>
      <Show when={local.controls ?? true}>
        <Controls />
      </Show>
      <Show when={local.minimap ?? true}>
        <MiniMap />
      </Show>
      {local.children}
    </SolidFlow>
  );
};
