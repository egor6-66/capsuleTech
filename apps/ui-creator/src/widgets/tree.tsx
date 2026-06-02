/**
 * Tree — иерархия нод (аналог devtools) + DnD-перемещение, нижняя секция сайдбара.
 *
 * Источник — общий `useEditor()`. Каждый узел рисуется по-разному:
 *  - КОНТЕЙНЕР (принимает детей) — это БОКС-обёртка (заголовок + блок детей);
 *    droppable висит на ВСЁМ боксе, поэтому drop «внутрь» ловится в любой точке
 *    области контейнера, и подсвечивается весь бокс — а не только заголовок;
 *  - ЛИСТ (Input/Button/…) — обычная строка только с reorder before/after.
 *
 * Вложенность работает за счёт hit-теста web-dnd (innermost droppable побеждает):
 * над строкой-листом → reorder этого листа (вставка в его родителя по позиции);
 * над пустым местом/паддингом бокса контейнера → drop ВНУТРЬ этого контейнера;
 * над вложенным контейнером → внутрь него. Линия-вставка = before/after, ring +
 * заливка бокса = «внутрь». Корень — только «внутрь» (нет соседей).
 *
 * Пока тащим, контейнеры-кандидаты (куда можно «внутрь») — слабый dashed-outline.
 * Чеврон сворачивает поддерево; `data-dnd-cancel` → клик по нему не стартует drag.
 *
 * Drag-id — `createUniqueId()` (per-instance), НЕ `tree:${nodeId}`: при переносе
 * между разными `<For>` стабильный доменный id даёт коллизию ключей в реестре
 * web-dnd (cleanup старого Row стирает регистрацию нового) → нода теряет
 * draggable. Уникальный per-instance id это исключает.
 */
import { createDraggable, createDroppable, type DragData, useDnD } from '@capsuletech/web-dnd';
import { getManifest } from '@capsuletech/web-ui-creator/manifests';
import { moveNode, type NodeId } from '@capsuletech/web-ui-creator/state';
import { createSignal, createUniqueId, For, type JSX, Show } from 'solid-js';
import { acceptsChildren, canMoveInto } from '../editor/rules';
import { useEditor } from '../editor/store';

type Zone = 'before' | 'after' | 'inside';
/** Толщина краевых полос «before»/«after» у контейнера (px). */
const EDGE = 6;

const label = (type: string): string => getManifest(type)?.label ?? type.split('.').pop() ?? type;
const icon = (type: string) => getManifest(type)?.icon;
const draggedId = (d: DragData | null): NodeId | null =>
  d && d.source === 'tree' && typeof d.nodeId === 'string' ? d.nodeId : null;

const Tree = Widget(() => {
  const { tree, setTree, dropTargetId } = useEditor();
  const dnd = useDnD();

  const [collapsed, setCollapsed] = createSignal<ReadonlySet<NodeId>>(new Set());
  const isCollapsed = (id: NodeId) => collapsed().has(id);
  const toggle = (id: NodeId) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const dragging = (): NodeId | null => draggedId(dnd.state.activeData());

  const Row = (p: { id: NodeId; depth: number }): JSX.Element => {
    const uid = createUniqueId();
    let headerEl: HTMLElement | undefined;
    let boxEl: HTMLElement | undefined;
    const node = () => tree().nodes[p.id];
    const hasChildren = () => node().children.length > 0;
    const isRoot = () => p.id === tree().root;
    const isContainer = () => acceptsChildren(node());

    const canInside = (d: NodeId) => canMoveInto(tree(), d, p.id);
    const canSibling = (d: NodeId) => {
      const par = node()?.parentId;
      return par != null && canMoveInto(tree(), d, par);
    };

    /** Применить drop по вычисленной зоне. */
    const apply = (d: NodeId, z: Zone | null) => {
      if (!z) return;
      try {
        if (z === 'inside') {
          setTree(moveNode(tree(), { nodeId: d, newParentId: p.id }));
          return;
        }
        const parentId = node().parentId;
        if (parentId == null) return;
        const sibs = tree().nodes[parentId].children.filter((c) => c !== d);
        let idx = sibs.indexOf(p.id);
        if (z === 'after') idx += 1;
        setTree(moveNode(tree(), { nodeId: d, newParentId: parentId, index: idx }));
      } catch {
        /* EditorOpError — тихо игнорим */
      }
    };

    const drag = createDraggable({
      id: uid,
      data: () => ({ source: 'tree', nodeId: p.id }),
    });

    // ── Контейнер: бокс-обёртка. Зона по позиции курсора:
    //   верхняя кромка → before (сосед), нижняя кромка → after, иначе → inside.
    const containerZone = (d: NodeId, clientY: number): Zone | null => {
      const sib = canSibling(d);
      if (sib && headerEl && clientY < headerEl.getBoundingClientRect().top + EDGE) return 'before';
      if (sib && boxEl && clientY > boxEl.getBoundingClientRect().bottom - EDGE) return 'after';
      if (canInside(d)) return 'inside';
      return sib ? 'after' : null;
    };
    const boxDrop = createDroppable({
      id: `tree-box:${uid}`,
      disabled: () => !isContainer(),
      accepts: (data) => {
        const d = draggedId(data);
        return d != null && (canInside(d) || canSibling(d));
      },
      onDrop: (data, info) => {
        const d = draggedId(data);
        if (d) apply(d, containerZone(d, info.pointer.y));
      },
    });

    // ── Лист: строка только reorder (before/after как сосед).
    const leafZone = (d: NodeId, ratioY: number): Zone | null => {
      if (!canSibling(d)) return null;
      return ratioY < 0.5 ? 'before' : 'after';
    };
    const leafDrop = createDroppable({
      id: `tree-leaf:${uid}`,
      disabled: () => isContainer(),
      accepts: (data) => {
        const d = draggedId(data);
        return d != null && canSibling(d);
      },
      onDrop: (data, info) => {
        const d = draggedId(data);
        if (d) apply(d, leafZone(d, info.ratio.y));
      },
    });

    const setBoxRef = (el: HTMLElement) => {
      boxEl = el;
      boxDrop.ref(el);
    };
    const setHeaderRef = (el: HTMLElement) => {
      headerEl = el;
      drag.ref(el);
    };
    const setLeafRef = (el: HTMLElement) => {
      headerEl = el;
      drag.ref(el);
      leafDrop.ref(el);
    };

    /** Зона на наведённом контейнере (для линии/ring). */
    const boxZone = (): Zone | null => {
      if (!boxDrop.isOver()) return null;
      const d = dragging();
      const pt = dnd.state.pointer();
      return d && pt ? containerZone(d, pt.y) : null;
    };
    const leafLine = (): Zone | null => {
      if (!leafDrop.isOver()) return null;
      const d = dragging();
      const pt = dnd.state.pointer();
      if (!d || !pt || !headerEl) return null;
      const r = headerEl.getBoundingClientRect();
      return leafZone(d, r.height ? (pt.y - r.top) / r.height : 0.5);
    };
    /** Контейнер-кандидат для drop «внутрь» — слабая подсветка пока тащим. */
    const insideCandidate = (): boolean => {
      const d = dragging();
      return d != null && d !== p.id && canInside(d);
    };

    const Header = (props: { ref: (el: HTMLElement) => void }) => (
      <div
        ref={props.ref}
        class="relative flex w-full min-w-0 cursor-grab items-center gap-1 rounded py-1 pr-1.5 text-sm hover:bg-accent/50"
        classList={{ 'opacity-40': drag.isDragging() }}
        style={{ 'padding-left': `${p.depth * 12 + 4}px` }}
      >
        <Show when={leafLine() === 'before'}>
          <div class="pointer-events-none absolute inset-x-0 -top-px z-10 h-0.5 rounded bg-primary" />
        </Show>
        <Show when={leafLine() === 'after'}>
          <div class="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-0.5 rounded bg-primary" />
        </Show>
        <Show when={hasChildren()} fallback={<span class="size-4 shrink-0" />}>
          <button
            type="button"
            data-dnd-cancel
            onClick={(e) => {
              e.stopPropagation();
              toggle(p.id);
            }}
            aria-label={isCollapsed(p.id) ? 'Развернуть' : 'Свернуть'}
            class="flex size-4 shrink-0 items-center justify-center text-foreground/40 transition-transform hover:text-foreground"
            classList={{ 'rotate-90': !isCollapsed(p.id) }}
          >
            ›
          </button>
        </Show>
        <span class="shrink-0 text-foreground/50">{icon(node().type)?.()}</span>
        <span class="truncate">{label(node().type)}</span>
      </div>
    );

    // Лист — просто строка.
    if (!isContainer()) return <Header ref={setLeafRef} />;

    // Контейнер — бокс (заголовок + блок детей), droppable на всём боксе.
    return (
      <div
        ref={setBoxRef}
        class="relative rounded pb-1"
        classList={{
          'bg-primary/10 ring-1 ring-primary ring-inset': boxZone() === 'inside',
          'outline outline-1 outline-dashed outline-primary/30':
            insideCandidate() && boxZone() !== 'inside',
          // Кросс-подсветка: цель drop'а из канваса (перетаскивание из палитры).
          'ring-2 ring-primary ring-inset bg-primary/10': dropTargetId() === p.id,
        }}
      >
        <Show when={boxZone() === 'before'}>
          <div class="pointer-events-none absolute inset-x-0 -top-px z-10 h-0.5 rounded bg-primary" />
        </Show>
        <Show when={boxZone() === 'after'}>
          <div class="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-0.5 rounded bg-primary" />
        </Show>
        <Header ref={setHeaderRef} />
        <Show when={hasChildren() && !isCollapsed(p.id)}>
          <For each={node().children}>{(cid) => <Row id={cid} depth={p.depth + 1} />}</For>
        </Show>
        <Show when={!hasChildren()}>
          <div
            class="text-xs italic text-foreground/30"
            style={{ 'padding-left': `${(p.depth + 1) * 12 + 4}px` }}
          >
            пусто
          </div>
        </Show>
      </div>
    );
  };

  return (
    <div class="flex h-full flex-col">
      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1">
        <Row id={tree().root} depth={0} />
      </div>
    </div>
  );
});

export default Tree;
