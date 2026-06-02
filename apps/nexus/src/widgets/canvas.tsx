import {
  createEdgeStore,
  createNodeStore,
  Flow,
  Handle,
  type Node,
  type NodeProps,
  NodeResizer,
} from '@capsuletech/web-flow';

/**
 * Canvas — top-level widget: нод-канвас дашборда на `@capsuletech/web-flow`.
 * Кастом-нода = NodeResizer + Handle-рёбра + `Views.NodeCard` (тело по виду из
 * `Entities.NodeKind`). Обёртка-нода бордера НЕ добавляет — единственный бордер
 * даёт `NodeCard` (Ui.Card). `createNode` мапит дропнутый `type` → ноду,
 * стартовый размер берёт из `NodeKind`.
 */

const WidgetNode = (props: NodeProps<{ type: string }>) => {
  const kind = () => Entities.NodeKind.defaults.find((k) => k.type === props.data?.type);
  return (
    <div class="relative h-full w-full">
      <NodeResizer minWidth={200} minHeight={140} visible={!!props.selected} />
      <Handle type="target" position="left" />
      <Views.NodeCard label={kind()?.label} icon={kind()?.icon} />
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
    };
  };

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} createNode={createNode} />;
});

export default Canvas;
