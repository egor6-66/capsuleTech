/**
 * Canvas — рабочая область конструктора (main-панель).
 *
 * Держит редактируемое дерево (`IEditorTree`) и рендерит его через
 * `@capsuletech/web-renderer`. Drop из палитры (`web-dnd`) добавляет ноду
 * операцией `addNode` в вычисленный контейнер НА вычисленную позицию.
 *
 * DnD-наводка считается реактивно из позиции курсора (`target()`):
 *  - идём `elementFromPoint` вверх до самого ВНУТРЕННЕГО валидного контейнера
 *    (innermost wins — родители под ним не считаются целью);
 *  - индекс вставки — по вертикали среди детей контейнера (не только «в конец»).
 *
 * Подсветка — инжектируемые Tailwind-классы (НЕ сырой `<style>`):
 *  - все валидные контейнеры-кандидаты — слабый inset-ring;
 *  - цель (innermost) — яркий ring + заливка;
 *  - позиция вставки — `border-t`/`border-b` на соседнем ребёнке.
 * Цель кладётся в `store.dropTargetId` → Tree подсвечивает тот же узел.
 *
 * Editor-инъекции (`ROOM`/`pb`/dashed) — только у пустых контейнеров или во
 * время drag; в покое вёрстка чистая.
 */
import { createDroppable, useDnD } from '@capsuletech/web-dnd';
import { type ISchema, type Registry, Renderer } from '@capsuletech/web-renderer';
import { addNode } from '@capsuletech/web-ui-creator/state';
import { createEffect, createMemo, onCleanup, Show } from 'solid-js';
import { acceptsChildren, canDropInto } from '../editor/rules';
import { useEditor } from '../editor/store';

const ROOM = 'min-h-12';
const EMPTY_CUE = 'rounded-md outline-dashed outline-1 outline-border/60';

interface IDropTarget {
  id: string;
  index: number;
}

const Canvas = Widget((Ui) => {
  const { tree, setTree, setDropTargetId } = useEditor();
  const registry = { ui: Ui } as unknown as Registry;
  const dnd = useDnD();

  /** Тип тащимого компонента из палитры (или null). */
  const draggedType = (): string | null => {
    const a = dnd.state.activeData();
    return a && a.source === 'palette' && typeof a.type === 'string' ? a.type : null;
  };

  /** Индекс вставки среди детей контейнера по вертикали курсора. */
  const indexAt = (containerEl: Element, containerId: string, y: number): number => {
    const kids = tree().nodes[containerId].children;
    for (let i = 0; i < kids.length; i++) {
      const cel = containerEl.querySelector(`[data-node-id="${kids[i]}"]`);
      if (!cel) continue;
      const r = cel.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return kids.length;
  };

  /**
   * Самый внутренний валидный контейнер под точкой + индекс вставки.
   * Без fallback на root: если под курсором нет валидного контейнера (курсор
   * вне любого блока) — цели нет, drop не происходит. Root растянут на всю
   * высоту канваса (`min-h-full`), поэтому «пустая» область — это его зона.
   */
  const resolveTarget = (x: number, y: number, type: string): IDropTarget | null => {
    let el = document.elementFromPoint(x, y) as HTMLElement | null;
    while (el) {
      const id = el.dataset.nodeId;
      if (id && tree().nodes[id] && canDropInto(tree().nodes[id].type, type)) {
        return { id, index: indexAt(el, id, y) };
      }
      el = el.parentElement;
    }
    return null;
  };

  const target = createMemo<IDropTarget | null>(() => {
    const t = draggedType();
    const pt = dnd.state.pointer();
    return t && pt ? resolveTarget(pt.x, pt.y, t) : null;
  });

  // Кросс-подсветка узла в дереве: пишем цель в общий стор.
  createEffect(() => setDropTargetId(target()?.id ?? null));
  onCleanup(() => setDropTargetId(null));

  const renderSchema = (): ISchema => {
    const src = tree();
    const dragType = draggedType();
    const tg = target();
    const nodes: ISchema['components']['nodes'] = {};
    for (const [id, n] of Object.entries(src.nodes)) {
      const accepts = acceptsChildren(n);
      const empty = accepts && n.children.length === 0;
      const valid = dragType != null && canDropInto(n.type, dragType);
      const isTarget = tg?.id === id;
      const isRoot = id === src.root;
      const cls = [
        n.props.class,
        isRoot ? 'min-h-full' : '',
        empty || valid ? ROOM : '',
        empty && !valid ? EMPTY_CUE : '',
        valid && !empty ? 'pb-6' : '',
        // Стиль как в дереве: кандидат — штриховой бордер, цель — яркий + заливка.
        valid && !isTarget
          ? 'outline outline-1 outline-dashed outline-primary/40 [outline-offset:-1px]'
          : '',
        isTarget ? 'outline outline-2 outline-primary bg-primary/10 [outline-offset:-2px]' : '',
      ]
        .filter(Boolean)
        .join(' ');
      nodes[id] = {
        ...n,
        props: { ...n.props, 'data-node-id': id, ...(cls ? { class: cls } : {}) },
      };
    }
    // Линия-вставка: border на соседнем ребёнке (или у конца контейнера).
    if (tg) {
      const kids = src.nodes[tg.id].children;
      const markId =
        kids.length === 0 ? null : tg.index < kids.length ? kids[tg.index] : kids[kids.length - 1];
      const edge = tg.index < kids.length ? 'border-t-2 border-primary' : 'border-b-2 border-primary';
      if (markId) {
        const m = nodes[markId];
        nodes[markId] = { ...m, props: { ...m.props, class: `${m.props.class ?? ''} ${edge}` } };
      }
    }
    return { components: { root: src.root, nodes } };
  };

  const isEmpty = () => tree().nodes[tree().root].children.length === 0;

  const drop = createDroppable({
    id: 'canvas-root',
    accepts: (d) => d.source === 'palette' && typeof d.type === 'string',
    onDrop: (d, info) => {
      const type = d.type as string;
      const tg = resolveTarget(info.pointer.x, info.pointer.y, type);
      if (!tg) return;
      try {
        const { tree: next } = addNode(tree(), { type, parentId: tg.id, index: tg.index });
        setTree(next);
      } catch {
        /* EditorOpError — тихо игнорим */
      }
    },
  });

  return (
    <div class="flex h-full flex-col">
      <div
        ref={drop.ref}
        class="relative min-h-0 flex-1 overflow-auto transition-colors"
        classList={{ 'bg-primary/5': draggedType() != null }}
      >
        <Show
          when={!isEmpty()}
          fallback={
            <div class="flex h-full items-center justify-center text-sm text-foreground/40">
              Перетащите компонент из палитры
            </div>
          }
        >
          <Renderer schema={renderSchema()} registry={registry} mode="static" />
        </Show>
      </div>
    </div>
  );
});

export default Canvas;
