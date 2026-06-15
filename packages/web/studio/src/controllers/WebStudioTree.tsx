/**
 * WebStudio.Tree — иерархия нод (devtools-стиль) + DnD на общем слое /state пакета
 * (ADR 032, фаза 6, чанк 2).
 *
 * Портировано из `apps/ui-creator/src/widgets/tree.tsx` с устранением антипаттернов:
 *  - `ctx.store.ctx as IWebStudioCtx` заменён на `useWebStudio()` (без кастов);
 *  - `createDraggable` / `createDroppable` из `@capsuletech/web-dnd` оставлены как
 *    есть (per-row DnD требует прямого управления ref, emitting-обёртка не подходит);
 *  - логика зон (zones.ts), подсветки (highlight.ts), label/icon (utils.ts),
 *    цветные метки (MarkPicker.tsx) и строка дерева (Row.tsx) — в `controllers/tree/`.
 *
 * Chrome (Dropdown для меток) — аффорданс редактора, не пользовательский контент.
 * Layout: Flex из @capsuletech/web-ui/flex.
 * НЕ читает `useWebStudioKit()` — контент-кит здесь не нужен.
 *
 * События (через useEmit):
 *  - `onTreeDragOver` → { spec, targetId, zone } — WebStudioController.onTreeDragOver
 *  - `onDrop`         → { spec, intent }          — WebStudioController.onDrop
 *  - `onSelect`       → NodeId                    — WebStudioController.onSelect
 *  - `onMark`         → { nodeId, color }         — WebStudioController.onMark
 */

import { useDnD } from '@capsuletech/web-dnd';
import { Flex } from '@capsuletech/web-ui/flex';
import { createSignal } from 'solid-js';
import { type DragSpec, dragSpec } from '../state/dnd';
import type { NodeId } from '../state/types';
import { Row } from './tree';
import { useWebStudio } from './useWebStudio';

/**
 * WebStudio.Tree — монтируется внутри `<WebStudio.Provider>`.
 *
 * Читает дерево и editor-state через `useWebStudio()`.
 * Chrome (метки, чевроны) использует компоненты из `@capsuletech/web-ui` напрямую.
 * Контент-кит (`useWebStudioKit()`) здесь не нужен — дерево не рендерит пользовательские компоненты.
 */
export const WebStudioTree = () => {
  const ws = useWebStudio();
  const dnd = useDnD();

  const spec = (): DragSpec | null => dragSpec(dnd.state.activeData());

  const [collapsed, setCollapsed] = createSignal<ReadonlySet<NodeId>>(new Set());
  const isCollapsed = (id: NodeId): boolean => collapsed().has(id);
  const toggle = (id: NodeId): void => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Flex orientation="vertical" class="h-full">
      <Flex orientation="vertical" class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1">
        <Row
          id={ws.tree.root}
          depth={0}
          ed={ws}
          spec={spec}
          isCollapsed={isCollapsed}
          toggle={toggle}
        />
      </Flex>
    </Flex>
  );
};
