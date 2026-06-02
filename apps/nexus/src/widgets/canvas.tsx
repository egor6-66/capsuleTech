import {
  createEdgeStore,
  createNodeStore,
  Flow,
  Handle,
  type Node,
  type NodeProps,
  NodeResizer,
} from '@capsuletech/web-flow';
import { GripVertical } from 'lucide-solid';

/**
 * Canvas — top-level widget: нод-канвас дашборда на `@capsuletech/web-flow`.
 * Кастом-нода = NodeResizer + Handle-рёбра + grip-бэйдж + `Widgets.NodeBody`.
 * ДнД — только за grip-бэйдж (`node.dragHandle = '.cap-widget-grip'`), чтобы
 * интерактив внутри виджета (пилюли/ползунки) не таскал ноду. `createNode`
 * мапит дропнутый `type` → ноду, стартовый размер берёт из `NodeKind`.
 * (Стилизация фрейма — отдельно, ADR 029.)
 */

const WidgetNode = (props: NodeProps<{ type: string }>) => {
  const kind = () => Entities.NodeKind.defaults.find((k) => k.type === props.data?.type);
  return (
    <div class="relative h-full w-full">
      <NodeResizer minWidth={200} minHeight={140} visible={!!props.selected} />
      <Handle type="target" position="left" />
      {/* drag-бэйдж — единственная зона ДнД (node.dragHandle) */}
      <div
        class="cap-widget-grip absolute right-1 top-1 z-10 cursor-move rounded p-0.5 text-muted-foreground hover:text-foreground"
        title="Перетащить"
      >
        <GripVertical class="size-4" />
      </div>
      <Widgets.NodeBody type={props.data?.type} label={kind()?.label} icon={kind()?.icon} />
      <Handle type="source" position="right" />
    </div>
  );
};

const nodeTypes = { widget: WidgetNode };

const Canvas = Widget(() => {
  const [nodes] = createNodeStore<typeof nodeTypes>([
    {
      id: 'files',
      type: 'widget',
      data: { type: 'files' },
      position: { x: 160, y: 120 },
      width: 300,
      height: 240,
      dragHandle: '.cap-widget-grip',
    },
  ]);
  const [edges] = createEdgeStore([]);

  const createNode = (type: string, position: { x: number; y: number }): Node => {
    const kind = Entities.NodeKind.defaults.find((k) => k.type === type);
    return {
      id: `${type}-${crypto.randomUUID()}`,
      type: 'widget',
      data: { type },
      position,
      width: kind?.w ?? 240,
      height: kind?.h ?? 180,
      dragHandle: '.cap-widget-grip',
    };
  };

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} createNode={createNode} />;
});

export default Canvas;
