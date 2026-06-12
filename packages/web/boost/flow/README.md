# @capsuletech/web-flow

Node-canvas примитив capsule: свободные позиции нод + рёбра + pan/zoom + NodeResizer. Solid-обёртка над `@dschz/solid-flow` (XYFlow на `@xyflow/system`).  ·  zone: **boost**  ·  status: **alpha (0.1.1)**

Light-mirror — `Ui.Flow` placeholder в kit (после Phase B6-placeholder). Композируется как content ячейки `Layout.Matrix` — это НЕ режим Matrix (см. [[027-web-flow-node-canvas|ADR 027]]).

> **Будет переименован в `@capsuletech/boost-flow`** в Phase W6 ([[web-rework-plan]] / ADR 046 D1).

## Install

```bash
pnpm add @capsuletech/web-flow
# peer deps:
pnpm add solid-js @capsuletech/web-style
```

## Minimum usage

```tsx
import { Flow } from '@capsuletech/web-flow';

const nodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node A' } },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'Node B' } },
];
const edges = [{ id: 'e1', source: '1', target: '2' }];

<Flow nodes={nodes} edges={edges} fitView />;
```

## Stack

- [`@dschz/solid-flow`](https://github.com/dsh-ze/solid-flow) — Solid wrapper.
- [`@xyflow/system`](https://xyflow.com/) — core node-canvas engine.

## Docs

- AI-anchor: [`docs/_meta/web-flow.md`](../../../docs/_meta/web-flow.md)
- Zone canon: [`docs/_meta/web-zones/boost.md`](../../../docs/_meta/web-zones/boost.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- ADR 027 (node-canvas composes, not Matrix-mode), ADR 044 (heavy=pkg / light=kit), ADR 046 D1 (boost-* namespace).
