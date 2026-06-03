/**
 * Tree — иерархия нод (devtools-стиль) + DnD на общем слое `editor/dnd.ts`.
 *
 * Каждый узел:
 *  - КОНТЕЙНЕР — БОКС-обёртка (заголовок + блок детей); droppable на всём боксе,
 *    поэтому drop ловится в любой точке области, подсвечивается весь бокс;
 *  - ЛИСТ — строка только с reorder before/after.
 *
 * Поверхность считает лишь зону (геометрия строки/бокса) → `treeIntent` сводит
 * к `DropIntent`, `applyDrop` применяет. Принимаем И палитру (add), И ноды
 * дерева (move) — единый `DragSpec`. Валидность — `canInto`/`canBeside`.
 *
 * Подсветка как в канвасе: кандидаты — штриховой бордер, цель — ring+заливка,
 * линия — before/after. Чеврон сворачивает поддерево (`data-dnd-cancel` —
 * клик по нему не стартует drag). Drag-id — `createUniqueId()` (per-instance),
 * чтобы перенос между разными `<For>` не ломал регистрацию в web-dnd.
 *
 * `dropTargetId` из стора — кросс-подсветка цели, на которую наводят в канвасе.
 */
import { createDraggable, createDroppable, useDnD } from '@capsuletech/web-dnd';
import { getManifest } from '@capsuletech/web-ui-creator/manifests';
import type { NodeId } from '@capsuletech/web-ui-creator/state';
import { createEffect, createSignal, createUniqueId, For, type JSX, Show } from 'solid-js';
import {
  applyDrop,
  canBeside,
  canInto,
  type DragSpec,
  dragSpec,
  treeIntent,
  type TreeZone,
} from '../editor/dnd';
import { acceptsChildren } from '../editor/rules';
import { useEditor } from '../editor/store';

/** Толщина краевых полос «before»/«after» у контейнера (px). */
const EDGE = 6;
/** Палитра цветных меток узлов (юзер помечает блоки для наглядности). */
const MARK_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
/** Полупрозрачная заливка из цвета (работает и с hex, и с var(--primary)). */
const fill = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

const label = (type: string): string => getManifest(type)?.label ?? type.split('.').pop() ?? type;
const icon = (type: string) => getManifest(type)?.icon;

const Tree = Widget((Ui) => {
  const { tree, setTree, dropTargetId, setDropTargetId, selectedId, setSelectedId, marks, setMark } =
    useEditor();
  const dnd = useDnD();

  const spec = (): DragSpec | null => dragSpec(dnd.state.activeData());

  const [collapsed, setCollapsed] = createSignal<ReadonlySet<NodeId>>(new Set());
  const isCollapsed = (id: NodeId) => collapsed().has(id);
  const toggle = (id: NodeId) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const Row = (p: { id: NodeId; depth: number }): JSX.Element => {
    const uid = createUniqueId();
    let headerEl: HTMLElement | undefined;
    let boxEl: HTMLElement | undefined;
    const node = () => tree().nodes[p.id];
    const hasChildren = () => node().children.length > 0;
    const isContainer = () => acceptsChildren(node());
    const mark = () => marks()[p.id];
    /** Цвет обводки узла: цветная метка доминирует, иначе — primary. */
    const colorOf = () => mark() ?? 'var(--primary)';

    /**
     * Единая подсветка бокса-контейнера через box-shadow (не border/outline —
     * не влияет на лайаут). Цвет всегда colorOf(): помеченный узел подсвечивается
     * своим цветом во ВСЕХ состояниях (выделение / drop-цель / кандидат / метка).
     *
     * Метка не выходит за строку: overflow:hidden на боксе + inset box-shadow
     * (не border) — лишней раскладочной коробки нет, бокового overflow тоже.
     */
    const boxStyle = (): JSX.CSSProperties | undefined => {
      const c = colorOf();
      if (spec() != null) {
        if (boxZone() === 'inside' || dropTargetId() === p.id)
          return { 'box-shadow': `inset 0 0 0 2px ${c}`, 'background-color': fill(c, 12) };
        if (insideCandidate())
          return { 'box-shadow': `inset 0 0 0 1px ${c}`, 'background-color': fill(c, 6) };
        if (mark())
          return { 'box-shadow': `inset 0 0 0 1px ${mark()}`, 'background-color': fill(mark()!, 8) };
        return undefined;
      }
      if (selectedId() === p.id)
        return { 'box-shadow': `inset 0 0 0 2px ${c}`, 'background-color': fill(c, 16) };
      if (mark())
        return { 'box-shadow': `inset 0 0 0 1px ${mark()}`, 'background-color': fill(mark()!, 8) };
      return undefined;
    };

    /** Зона контейнера по позиции курсора: кромки → before/after, иначе inside. */
    const containerZone = (s: DragSpec, clientY: number): TreeZone | null => {
      const sib = canBeside(tree(), s, p.id);
      if (sib && headerEl && clientY < headerEl.getBoundingClientRect().top + EDGE) return 'before';
      if (sib && boxEl && clientY > boxEl.getBoundingClientRect().bottom - EDGE) return 'after';
      if (canInto(tree(), s, p.id)) return 'inside';
      return sib ? 'after' : null;
    };
    /** Зона листа: пополам before/after (только сосед). */
    const leafZone = (s: DragSpec, ratioY: number): TreeZone | null => {
      if (!canBeside(tree(), s, p.id)) return null;
      return ratioY < 0.5 ? 'before' : 'after';
    };

    const commit = (s: DragSpec, zone: TreeZone | null) => {
      if (!zone) return;
      const it = treeIntent(tree(), s, p.id, zone);
      if (it) setTree(applyDrop(tree(), s, it));
    };

    const drag = createDraggable({
      id: uid,
      data: () => ({ source: 'tree', nodeId: p.id }),
    });
    const boxDrop = createDroppable({
      id: `tree-box:${uid}`,
      disabled: () => !isContainer(),
      accepts: (data) => {
        const s = dragSpec(data);
        return s != null && (canInto(tree(), s, p.id) || canBeside(tree(), s, p.id));
      },
      onDrop: (data, info) => {
        const s = dragSpec(data);
        if (s) commit(s, containerZone(s, info.pointer.y));
      },
    });
    const leafDrop = createDroppable({
      id: `tree-leaf:${uid}`,
      disabled: () => isContainer(),
      accepts: (data) => {
        const s = dragSpec(data);
        return s != null && canBeside(tree(), s, p.id);
      },
      onDrop: (data, info) => {
        const s = dragSpec(data);
        if (s) commit(s, leafZone(s, info.ratio.y));
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

    const boxZone = (): TreeZone | null => {
      if (!boxDrop.isOver()) return null;
      const s = spec();
      const pt = dnd.state.pointer();
      return s && pt ? containerZone(s, pt.y) : null;
    };
    const leafLine = (): TreeZone | null => {
      if (!leafDrop.isOver()) return null;
      const s = spec();
      const pt = dnd.state.pointer();
      if (!s || !pt || !headerEl) return null;
      const r = headerEl.getBoundingClientRect();
      return leafZone(s, r.height ? (pt.y - r.top) / r.height : 0.5);
    };
    /** Контейнер-кандидат для drop «внутрь» — слабый штрих пока тащим. */
    const insideCandidate = (): boolean => {
      const s = spec();
      return s != null && canInto(tree(), s, p.id);
    };

    // Двусторонний синк: пока курсор над ЭТОЙ строкой — пишем цель в общий стор
    // (канвас подсветит тот же контейнер). Если над строкой, но валидной зоны нет
    // — чистим, чтобы подсветка не залипала. Сброс по концу drag делает Canvas.
    createEffect(() => {
      const s = spec();
      if (!s) return;
      if (!boxDrop.isOver() && !leafDrop.isOver()) return;
      const zone = boxZone() ?? leafLine();
      setDropTargetId(zone ? (treeIntent(tree(), s, p.id, zone)?.parentId ?? null) : null);
    });

    const Header = (props: { ref: (el: HTMLElement) => void }) => (
      <div
        ref={props.ref}
        onClick={() => setSelectedId((cur) => (cur === p.id ? null : p.id))}
        class="relative flex w-full min-w-0 cursor-grab items-center gap-1 rounded py-1 pr-1.5 text-sm hover:bg-accent/50"
        classList={{
          'opacity-40': drag.isDragging(),
        }}
        style={{
          'padding-left': `${p.depth * 12 + 4}px`,
          // Выделение листа в ЦВЕТЕ МЕТКИ (метка доминирует над primary).
          // Используем inline-style чтобы не хардкодить primary: цвет динамический.
          ...(selectedId() === p.id && !isContainer()
            ? {
                'box-shadow': `inset 0 0 0 2px ${colorOf()}`,
                'background-color': fill(colorOf(), 20),
              }
            : mark()
              ? {
                  'box-shadow': `inset 0 0 0 1px ${mark()}`,
                  'background-color': fill(mark()!, 8),
                }
              : {}),
        }}
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
        <Show when={isContainer()}>
          {/* Цветная метка — через наш Ui.Dropdown (портал + позиционирование),
              не кастомный поповер. Клик не должен выделять ноду/стартовать drag. */}
          <span class="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
            <Ui.Dropdown>
              <Ui.Dropdown.Trigger
                data-dnd-cancel
                title="Цветная метка"
                class="block size-3.5 rounded-full border border-foreground/30"
                style={mark() ? { 'background-color': mark() } : undefined}
              />
              <Ui.Dropdown.Content class="flex items-center gap-1 p-1">
                <For each={MARK_COLORS}>
                  {(c) => (
                    <Ui.Dropdown.Item
                      class="size-4 cursor-pointer rounded-full p-0"
                      style={{ 'background-color': c }}
                      onSelect={() => {
                        setMark(p.id, c);
                      }}
                    />
                  )}
                </For>
                <Ui.Dropdown.Item
                  class="flex size-4 cursor-pointer items-center justify-center rounded-full border border-border p-0 text-foreground/60"
                  onSelect={() => {
                    setMark(p.id, null);
                  }}
                >
                  ×
                </Ui.Dropdown.Item>
              </Ui.Dropdown.Content>
            </Ui.Dropdown>
          </span>
        </Show>
      </div>
    );

    // Лист — просто строка.
    if (!isContainer()) return <Header ref={setLeafRef} />;

    // Контейнер — бокс (заголовок + блок детей), droppable на всём боксе.
    return (
      <div ref={setBoxRef} class="relative overflow-hidden rounded pb-1" style={boxStyle()}>
        <Show when={boxZone() === 'before'}>
          <div
            class="pointer-events-none absolute inset-x-0 -top-px z-10 h-0.5 rounded"
            style={{ 'background-color': colorOf() }}
          />
        </Show>
        <Show when={boxZone() === 'after'}>
          <div
            class="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-0.5 rounded"
            style={{ 'background-color': colorOf() }}
          />
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
