---
tags: [hca, package, flow]
status: documented
type: guide
---

# Flow — node-canvas примитив

> [!info]
> `@capsuletech/web-flow` — обёртка над `@dschz/solid-flow` (Solid-порт xyflow). Рисует ноды (rectangle, свободные позиции) + рёбра (связи) + pan/zoom + NodeResizer. Композируется как компонент, включая в ячейку `Layout.Matrix`.

## Концепция

Node-canvas — это визуальное представление графа (ноды + рёбра). Отличается от грида (`Layout.Matrix` ADR 026) тем, что ноды двигаются **плавно** (пиксельные координаты, не снап в клетки) и могут быть **соединены** рёбрами (выражение связей). 

Приложение передаёт Flow данные (массив нод + массив рёбер + типы нод), Flow рендерит канвас и даёт два способа мутировать:
1. **Палитра→drop** — `FlowPalette` (боковая панель) + drag нового вида → drop на канвас = новая нода.
2. **API мутации** — `flow.addNodes()`, `flow.updateNode()`, `flow.addEdges()` (из solid-flow).

Тема автоматически следует активной теме приложения (light/dark) и токены палитры (цвета рёбер, ручек, фона).

## Команды / Использование

### Базовый Flow без палитры

```tsx
import { Flow, createNodeStore, createEdgeStore } from '@capsuletech/web-flow';

const MyFlow = () => {
  const nodes = createNodeStore([
    { id: '1', data: { label: 'Node 1' }, position: { x: 0, y: 0 } },
    { id: '2', data: { label: 'Node 2' }, position: { x: 200, y: 0 } },
  ]);

  const edges = createEdgeStore([
    { id: 'e1-2', source: '1', target: '2' },
  ]);

  return <Flow nodes={nodes()} edges={edges()} />;
};
```

### Flow с палитрой и drop-to-add

```tsx
import { 
  Flow, 
  FlowPalette,
  createNodeStore, 
  createEdgeStore,
  type Node,
} from '@capsuletech/web-flow';
import { Layout } from '@capsuletech/web-ui';

const MyFlowApp = () => {
  const nodes = createNodeStore([]);
  const edges = createEdgeStore([]);

  const paletteItems = [
    { type: 'input', label: 'Input Node' },
    { type: 'process', label: 'Process' },
    { type: 'output', label: 'Output' },
  ];

  const handleCreateNode = (type: string, position: { x: number; y: number }): Node => {
    return {
      id: `node-${Date.now()}`,
      type,
      data: { label: `${type} node` },
      position,
    };
  };

  return (
    <Layout preset="app-shell" slots={{
      sidebar: <FlowPalette items={paletteItems} />,
      main: (
        <Flow
          nodes={nodes()}
          edges={edges()}
          nodeTypes={{}}
          createNode={handleCreateNode}
        />
      ),
    }} />
  );
};
```

### Кастомная нода

```tsx
import { NodeProps, Handle, NodeResizer } from '@capsuletech/web-flow';

const CustomNode = (props: NodeProps) => (
  <div class="border border-primary bg-card rounded-lg p-4">
    <Handle type="target" position="top" />
    
    <div class="mb-2 font-semibold">{props.data.label}</div>
    <div class="text-sm text-muted">{props.data.description}</div>
    
    <Handle type="source" position="bottom" />
    <NodeResizer />
  </div>
);

// Использование
<Flow
  nodes={nodes()}
  edges={edges()}
  nodeTypes={{ custom: CustomNode }}
/>
```

### Управление ноями и рёбрами

```tsx
// Добавить ноду программно
const addNode = () => {
  const newNode: Node = {
    id: `node-${Date.now()}`,
    data: { label: 'New' },
    position: { x: 100, y: 100 },
  };
  flow.addNodes(newNode);
};

// Обновить ноду
const updateNode = (id: string, data: any) => {
  flow.updateNode(id, { data });
};

// Добавить ребро
const addEdge = () => {
  flow.addEdges({
    id: `edge-${Date.now()}`,
    source: 'node-1',
    target: 'node-2',
  });
};
```

## Персонализация темы

Flow **автоматически** следует активной теме приложения (light/dark, цветовая палитра). Не нужно ничего делать — просто используй Flow рядом с компонентом тема-тоглер.

Если нужно явно задать режим:

```tsx
<Flow
  nodes={nodes()}
  edges={edges()}
  colorMode="dark"  // 'light' или 'dark'
/>
```

Палитра цветов (рёбра, ручки, фон) настраивается в `flow.css` (переменные `--xy-*`); они следуют `[data-theme]` атрибуту документа.

## Композиция в Layout.Matrix

Типичная компоновка: Canvas в центре (`main`), палитра в боковой панели (`sidebar`):

```tsx
import { Layout, Matrix } from '@capsuletech/web-ui';
import { Flow, FlowPalette } from '@capsuletech/web-flow';

const Dashboard = () => {
  const nodes = createNodeStore([...]);
  const edges = createEdgeStore([...]);
  const paletteItems = [...];

  return (
    <Layout preset="app-shell" slots={{
      header: <Header />,
      sidebar: (
        <FlowPalette 
          items={paletteItems}
          class="bg-muted border-r"
        />
      ),
      main: (
        <Flow
          nodes={nodes()}
          edges={edges()}
          nodeTypes={{/* кастомные типы */}}
          createNode={(type, pos) => ({
            id: `${type}-${Date.now()}`,
            type,
            data: { label: type },
            position: pos,
          })}
          background="dots"
          controls
          minimap
        />
      ),
      footer: <Footer />,
    }} />
  );
};
```

## Примеры в кодбейсе

- **`apps/nexus`** — dashboard с node-canvas (live demo; пользователь подтвердил UX)

## Props-справка

### Flow

| Проп | Тип | Дефолт | Что делает |
|---|---|---|---|
| `nodes` | `Node[]` | — | Массив нод |
| `edges` | `Edge[]` | — | Массив рёбер |
| `nodeTypes` | `Record<string, Component>` | `{}` | Map тип → компонент (для кастомных нод) |
| `createNode?` | `(type, pos) => Node` | `undefined` | Callback для palette→drop. Omit чтобы отключить drop |
| `background` | `false \| 'dots' \| 'lines' \| 'cross'` | `'dots'` | Background pattern |
| `controls` | `boolean` | `true` | Показывать zoom/fit кнопки |
| `minimap` | `boolean` | `true` | Показывать minimap |
| `colorMode` | `'light' \| 'dark'` | `useDarkMode()` | Тема канваса |
| `fitView` | `boolean` | `true` | Auto-fit на монтаж |
| `fitViewOptions` | `object` | `{ maxZoom: 1 }` | Опции fitView |
| `class` | `string` | `''` | Extra CSS-класс |

### FlowPalette

| Проп | Тип | Дефолт | Что делает |
|---|---|---|---|
| `items` | `IFlowPaletteItem[]` | — | Список видов нод для drag |
| `class` | `string` | `''` | Extra CSS-класс |

**IFlowPaletteItem:**
```ts
{
  type: string;           // Уникальный ID вида ноды
  label: string;          // Отображаемый текст
  icon?: (props: { class?: string }) => JSX.Element;  // Иконка (lucide-solid, и т.д.)
}
```

## Troubleshooting

**Нода не падает в центр курсора** — проверь `createNode` возвращает Node с `width` и `height`. Drop-логика сдвигает на `-w/2, -h/2`; без размеров offset = 0.

**Flow не синкит с тоглом dark-mode** — убедись `@capsuletech/web-style` в `peerDependencies` (не `dependencies`). Если web-style бандлится в dist, Flow читает отдельный dark-сигнал.

**Palette-drop не работает** — 
- Проверь `createNode` задана в Flow
- Убедись FlowPalette передаёт правильный `type` в dataTransfer (браузер > DevTools > Elements > drag → смотри dataTransfer)
- Проверь `onDrop` вызывается (добавь console.log в `Flow.tsx`)

**CSS-стили палитры не видно** — Flow импортит `@dschz/solid-flow/styles` и локальный `./flow.css`. Убедись Vite видит эти импорты (workspace-dev). Для дист-сборки см. release-TODO в OWNERSHIP.

**Нода слишком большая / слишком маленькая в minimap** — подправь `fitViewOptions`:

```tsx
<Flow
  fitViewOptions={{
    padding: 0.2,      // padding around nodes
    maxZoom: 1.5,      // max zoom level when fitting
    minZoom: 0.1,
  }}
/>
```

## Связанное

- [[027-web-flow-node-canvas]] — ADR (решение, альтернативы)
- [[ui]] — Layout.Matrix (как компоновать Flow в grid)
- [[web-style]] — темы и dark-mode sync
- [[web-dnd]] — DnD примитивы (если нужны свои drop-zones)
