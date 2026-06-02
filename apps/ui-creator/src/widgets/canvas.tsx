/**
 * Canvas — рабочая область конструктора (main-панель).
 *
 * Рендерит дерево (`IEditorTree`) через `@capsuletech/web-renderer` в режиме
 * `static` — компоненты-«болванки» без собственного поведения.
 *
 * В ПОКОЕ канвас НЕ навешивает никаких стилей на ноды (кроме `data-node-id` для
 * hit-теста) — компоненты выглядят как есть. Любая подсветка живёт ТОЛЬКО во
 * время drag: кандидаты — штриховой бордер, цель — ring + заливка, линия-вставка;
 * пустым контейнерам на время drag даётся `min-h`, чтобы было куда целиться.
 *
 * DnD — общий слой `editor/dnd.ts`. Цель подсветки берётся из общего
 * `store.dropTargetId` (двусторонний синк с деревом): курсор над канвасом —
 * канвас пишет цель и рисует линию; курсор над деревом — дерево пишет цель, а
 * канвас лишь подсвечивает тот же контейнер.
 */
import { createDroppable, useDnD } from '@capsuletech/web-dnd';
import { type ISchema, type Registry, Renderer } from '@capsuletech/web-renderer';
import { createEffect, createMemo, onCleanup, Show } from 'solid-js';
import { applyDrop, canInto, canvasIntent, type DragSpec, dragSpec, type DropIntent } from '../editor/dnd';
import { acceptsChildren } from '../editor/rules';
import { useEditor } from '../editor/store';

const ROOM = 'min-h-12';
const CAND = 'outline outline-1 outline-dashed outline-primary/40 [outline-offset:-1px]';
const TARGET = 'outline outline-2 outline-primary bg-primary/10 [outline-offset:-2px]';
const LINE_BEFORE = 'border-t-2 border-primary';
const LINE_END = 'border-b-2 border-primary';

const Canvas = Widget((Ui) => {
  const { tree, setTree, dropTargetId, setDropTargetId } = useEditor();
  const registry = { ui: Ui } as unknown as Registry;
  const dnd = useDnD();

  const spec = (): DragSpec | null => dragSpec(dnd.state.activeData());

  const drop = createDroppable({
    id: 'canvas-root',
    accepts: (d) => dragSpec(d) != null,
    onDrop: (d, info) => {
      const s = dragSpec(d);
      if (!s) return;
      const it = canvasIntent(tree(), s, info.pointer.x, info.pointer.y);
      if (it) setTree(applyDrop(tree(), s, it));
    },
  });

  // Локальная цель канваса — только когда курсор НАД канвасом (для линии-вставки
  // и записи в общий стор). Над деревом intent = null (canvasIntent не вызываем).
  const intent = createMemo<DropIntent | null>(() => {
    const s = spec();
    const pt = dnd.state.pointer();
    if (!s || !pt || !drop.isOver()) return null;
    return canvasIntent(tree(), s, pt.x, pt.y);
  });

  // Двусторонний синк: пишем цель пока курсор над канвасом; чистим по концу drag.
  createEffect(() => {
    if (!dnd.state.activeData()) {
      setDropTargetId(null);
      return;
    }
    if (drop.isOver()) setDropTargetId(intent()?.parentId ?? null);
  });
  onCleanup(() => setDropTargetId(null));

  const renderSchema = (): ISchema => {
    const src = tree();
    const s = spec();
    const it = intent();
    const tgt = dropTargetId();
    const nodes: ISchema['components']['nodes'] = {};
    for (const [id, n] of Object.entries(src.nodes)) {
      const accepts = acceptsChildren(n);
      const empty = accepts && n.children.length === 0;
      const cand = s != null && canInto(src, s, id);
      const isTarget = tgt === id;
      const cls = [
        n.props.class,
        cand && empty ? ROOM : '',
        cand && !isTarget ? CAND : '',
        isTarget ? TARGET : '',
        // линия в конец контейнера (нет beforeId) — только когда курсор над канвасом
        isTarget && it?.parentId === id && it.beforeId == null && !empty ? LINE_END : '',
      ]
        .filter(Boolean)
        .join(' ');
      nodes[id] = { ...n, props: { ...n.props, 'data-node-id': id, ...(cls ? { class: cls } : {}) } };
    }
    if (it?.beforeId && nodes[it.beforeId]) {
      const m = nodes[it.beforeId];
      nodes[it.beforeId] = {
        ...m,
        props: { ...m.props, class: `${m.props.class ?? ''} ${LINE_BEFORE}` },
      };
    }
    return { components: { root: src.root, nodes } };
  };

  const isEmpty = () => tree().nodes[tree().root].children.length === 0;

  return (
    <div class="flex h-full flex-col">
      <div
        ref={drop.ref}
        class="relative min-h-0 flex-1 overflow-auto"
        classList={{ 'bg-primary/5': spec() != null }}
      >
        <Renderer schema={renderSchema()} registry={registry} mode="static" />
        <Show when={isEmpty()}>
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-foreground/40">
            Перетащите компонент из палитры
          </div>
        </Show>
      </div>
    </div>
  );
});

export default Canvas;
