---
name: "@capsuletech/web-renderer"
owner-agent: owner-web-renderer
group: web_base
zone: runtime
status: beta
priority: P1
last-updated: 2026-06-11
---

# OWNERSHIP — @capsuletech/web-renderer

Owner-agent: **owner-web-renderer**

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — чистый runtime для рендера UI по JSON-схеме (`ISchema` → Solid JSX). Stateless; design-time concerns живут в `web-ui-creator`.
- **Status:** `beta` (0.1.1) — 52 tests, 9-slot backlog closed 2026-05-18.
- **Priority:** **P1** — основа editor + production-режима с editable pages.
- **Maturity bar (до stable):**
  - `controlled` / `static` / `full` (JSON FSM) render modes implemented.
  - `IInteraction` shape расширен (FSM-config).
  - `IEditorNode` shape extensions stable across release cycle.
- **Active blockers:** нет.
- **Roadmap:**
  1. `full` mode (JSON FSM-конфиг) impl.
  2. New `IInteraction` shapes по запросу.
  3. Performance audit на больших деревьях.
- **Last activity:** 2026-06-11 (canon refresh).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/

Renderer — leaf-пакет zone runtime. Никаких additional vendors (по дизайну: production-safe, без zod/manifests overhead'а).

## Зона ответственности

Всё внутри `packages/web/renderer/`. В чужие пакеты не лезем.

## Публичный API

```ts
import {
  Renderer,
  resolvePath,
  type ISchema,
  type IEditorNode,
  type IInteraction,
  type IRendererProps,
  type IEditOverlayProps,   // ADR 031 — edit-decoration режим
  type IErrorFallbackProps,
  type Registry,
  type RenderMode,
  type NodeId,
} from '@capsuletech/web-renderer';
```

### IRendererProps (ключевые поля)

| Prop | Тип | Обязателен | Описание |
|---|---|---|---|
| `schema` | `ISchema` | да | Дерево нод + interactions |
| `registry` | `Registry` | да | Словарь компонентов по dot-path |
| `mode` | `RenderMode` | нет, default `'controlled'` | Шкала interaction-возможностей |
| `editOverlay` | `Component<IEditOverlayProps>` | нет | ADR 031: per-node overlay-слот для editor-chrome |
| `fallback` | `Component<{type,nodeId}>` | нет | Fallback при нерезолвящемся type |
| `errorFallback` | `Component<IErrorFallbackProps>` | нет | Fallback при runtime-ошибке в компоненте ноды |
| `loadingFallback` | `JSX.Element` | нет | Fallback для верхнего `<Suspense>` |

### IEditOverlayProps (ADR 031)

```ts
interface IEditOverlayProps {
  nodeId: NodeId;
  node: IEditorNode;
}
```

Рендерер монтирует `Component<IEditOverlayProps>` для каждой ноды в overlay-слот
(`position:absolute; inset:0`) внутри бокса ноды. Ноль замеров геометрии — только CSS.
Корень ноды форсится `position:relative`.

Void-ноды (`ui.Input`, `ui.Separator`, `ui.Image` и др.) оборачиваются в
`<span style="display:block; position:relative">` — создаёт реальный containing block.
`display:contents` не используется: по CSS-спеке он не создаёт own box и `position:relative`
на нём игнорируется браузером (overlay уходил бы к ближайшему настоящему containing block).

## RenderMode

| Mode | Поведение |
|---|---|
| `static` | Только components, interactions игнорируются |
| `controlled` | + interactions.ref на готовые Controllers/Features (v1) |
| `full` | + interactions.inline JSON FSM (v1.2+, NOT IMPLEMENTED) |

`editOverlay` ортогонален `mode` — работает с любым значением mode.

## Тесты

Расположение: `src/__tests__/` — 61 тест (2026-06-03).

Coverage:
- Renderer mount/unmount + schema swap
- RenderNode recursion + children handling
- resolvePath dot-paths + missing paths fallback
- activeInteractions filter by mode + nodeId
- DefaultFallback / custom fallback / errorFallback
- thunk-chain: Wrapper Context.Provider ДО inner Component (CRITICAL)
- DEV schema validation (Slot 7)
- runtime props reactivity (Slot 6)
- **editOverlay (ADR 031)**: overlay per-node, без overlay регрессия, void-нода, void-обёртка NOT display:contents (структурный), ортогональность mode

## Известные грабли

1. **`IEditorNode` дублируется** между web-renderer и web-ui-creator. Source-of-truth у редактора — `web-ui-creator/state/types.ts`. ADR-кандидат: `shared-renderer-types` пакет.
2. **`resolvePath` не бросает при missing path** — fallback (DevWarn + null). Custom fallback через `Renderer.fallback`. Не делай throw.
3. **`VOID_NODE_TYPES`** — hard-coded Set в `renderer.tsx`. При добавлении нового void-примитива в `web-ui` — добавить сюда.
4. **`display:block; position:relative` на span** (void-обёртка): `display:contents` явно не используется — он не создаёт own box, поэтому `position:relative` на нём браузером игнорируется (overlay уходил бы к ближайшему настоящему containing block, т.е. к родителю, а не к самому инпуту). Jsdom этот баг не ловит — только реальный браузер.
5. **`createComponent` вместо `<Dynamic>`** — намеренно: `<Dynamic>` ломает thunk-chain useCtx() в nested Controllers/Features.
6. **Schema mutated in-place не реактивна** — Solid не ловит mutation. Используй immutable replace (createSignal + replaceProps).

## Cross-package boundaries

- **web-ui-creator** — design-time side того же JSON-tree. IEditorNode ДОЛЖЕН совпадать.
- **web-ui** — поставляет компоненты в registry (не прямой dep).
- **web-core** — НЕ depends on web-renderer (alternative, сосуществует).
- **VOID_NODE_TYPES** — список типов, которые рендерит web-ui (ui.Input, ui.Separator, ui.Image и т.п.).

## Roadmap

- [ ] Унифицировать `IEditorNode` shape с web-ui-creator (shared types, ADR)
- [ ] Реализовать `full` RenderMode (JSON FSM) — нужен ADR + согласование с owner-web-state
- [ ] Renderer prerender для SSR (сейчас CSR-only)
- [ ] Streaming render для больших trees
- [ ] DevTools integration (render-tree exporter для web-profiler)
- [ ] `voidTypes` prop (расширяемый список void-нод от хоста, v2)
