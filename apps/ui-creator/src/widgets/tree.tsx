/**
 * Tree — иерархия нод (аналог devtools) + DnD-перемещение, нижняя секция сайдбара.
 *
 * Источник — общий `useEditor()`. Рекурсивный рендер: на ноду строка (иконка +
 * label, отступ по глубине). Каждая строка ОДНОВРЕМЕННО draggable (тащим ноду) и
 * droppable (бросаем в неё → `moveNode`, если `canMoveInto`). DnD через тот же
 * DnDProvider (Constructor), различаем по `source:'tree'` (palette не пересекается).
 * Меняет общий стор → canvas обновляется синхронно.
 *
 * Пока drop = «внутрь» (reparent). Реордер сиблингов (drop-линии) — следующим шагом.
 */
import { createDraggable, createDroppable } from '@capsuletech/web-dnd';
import { getManifest } from '@capsuletech/web-ui-creator/manifests';
import { moveNode } from '@capsuletech/web-ui-creator/state';
import { For, type JSX } from 'solid-js';
import { canMoveInto } from '../editor/rules';
import { useEditor } from '../editor/store';

const label = (type: string): string => getManifest(type)?.label ?? type.split('.').pop() ?? type;
const icon = (type: string) => getManifest(type)?.icon;

const Tree = Widget(() => {
  const { tree, setTree } = useEditor();

  const Row = (p: { id: string; depth: number }): JSX.Element => {
    const node = () => tree().nodes[p.id];
    const drag = createDraggable({
      id: `tree:${p.id}`,
      data: () => ({ source: 'tree', nodeId: p.id }),
    });
    const drop = createDroppable({
      id: `tree-drop:${p.id}`,
      accepts: (d) =>
        d.source === 'tree' && typeof d.nodeId === 'string' && canMoveInto(tree(), d.nodeId, p.id),
      onDrop: (d) => {
        if (typeof d.nodeId !== 'string' || !canMoveInto(tree(), d.nodeId, p.id)) return;
        try {
          setTree(moveNode(tree(), { nodeId: d.nodeId, newParentId: p.id }));
        } catch {
          /* EditorOpError — тихо игнорим */
        }
      },
    });
    const setRef = (el: HTMLElement) => {
      drag.ref(el);
      drop.ref(el);
    };

    return (
      <>
        <div
          ref={setRef}
          class="flex cursor-grab items-center gap-1.5 rounded px-1.5 py-1 text-sm hover:bg-accent/50"
          classList={{
            'opacity-40': drag.isDragging(),
            'bg-primary/10 ring-1 ring-primary ring-inset': drop.canDrop(),
          }}
          style={{ 'padding-left': `${p.depth * 14 + 6}px` }}
        >
          <span class="shrink-0 text-foreground/50">{icon(node().type)?.()}</span>
          <span class="truncate">{label(node().type)}</span>
        </div>
        <For each={node().children}>{(cid) => <Row id={cid} depth={p.depth + 1} />}</For>
      </>
    );
  };

  return (
    <div class="flex h-full flex-col">
      <div class="shrink-0 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
        Дерево
      </div>
      <div class="min-h-0 flex-1 overflow-auto p-1">
        <Row id={tree().root} depth={0} />
      </div>
    </div>
  );
});

export default Tree;
