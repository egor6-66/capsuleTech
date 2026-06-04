/**
 * Editor.Tree — иерархия нод (devtools-стиль) + DnD на общем слое /state пакета
 * (ADR 032, фаза 6, чанк 2).
 *
 * Портировано из `apps/ui-creator/src/widgets/tree.tsx` с устранением антипаттернов:
 *  - `ctx.store.ctx as IEditorCtx` заменён на `useEditor()` (без кастов);
 *  - `createDraggable` / `createDroppable` из `@capsuletech/web-dnd` оставлены как
 *    есть (per-row DnD требует прямого управления ref, emitting-обёртка не подходит);
 *  - `MARK_COLORS`, `EDGE`, `fill()`, `label()`, `icon()` вынесены в модуль
 *    (`editorTreeUtils`) прямо здесь (нет других потребителей вне этого файла).
 *
 * Chrome (Dropdown для меток) — аффорданс редактора, не пользовательский контент.
 * Использует `Dropdown` из `@capsuletech/web-ui` напрямую (chrome-кит = web-ui).
 * НЕ читает `useEditorKit()` — контент-кит здесь не нужен.
 *
 * События (через useEmit):
 *  - `onTreeDragOver` → { spec, targetId, zone } — EditorController.onTreeDragOver
 *  - `onDrop`         → { spec, intent }          — EditorController.onDrop
 *  - `onSelect`       → NodeId                    — EditorController.onSelect
 *  - `onMark`         → { nodeId, color }         — EditorController.onMark
 */

import { createDraggable, createDroppable, useDnD } from '@capsuletech/web-dnd';
import { useEmit } from '@capsuletech/web-core';
import { Dropdown } from '@capsuletech/web-ui/dropdown';
import { getManifest } from '../manifests/registry';
import { acceptsChildren } from '../manifests/rules';
import { canBeside, canInto, dragSpec, type DragSpec, type TreeZone } from '../state/dnd';
import type { NodeId } from '../state/types';
import { createEffect, createSignal, createUniqueId, For, type JSX, Show } from 'solid-js';
import { useEditor } from './useEditor';

// ── Утилиты (editor-chrome specific) ─────────────────────────────────────────

/** Толщина краевых полос «before»/«after» у контейнера (px). */
const EDGE = 6;

/** Палитра цветных меток узлов (юзер помечает блоки для наглядности). */
const MARK_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

/** Полупрозрачная заливка из цвета (работает и с hex, и с var(--primary)). */
const fill = (c: string, pct: number): string => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/** Человекочитаемый лейбл ноды из манифеста. */
const label = (type: string): string => getManifest(type)?.label ?? type.split('.').pop() ?? type;

/** Иконка из манифеста (JSX-функция или undefined). */
const icon = (type: string): (() => JSX.Element) | undefined => getManifest(type)?.icon;

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Editor.Tree — монтируется внутри `<Editor.Provider>`.
 *
 * Читает дерево и editor-state через `useEditor()`.
 * Chrome (метки, чевроны) использует `Dropdown` из `@capsuletech/web-ui` напрямую.
 * Контент-кит (`useEditorKit()`) здесь не нужен — дерево не рендерит пользовательские компоненты.
 */
export const EditorTree = () => {
  const ed = useEditor();
  const emit = useEmit();
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

  const Row = (p: { id: NodeId; depth: number }): JSX.Element => {
    const uid = createUniqueId();
    let headerEl: HTMLElement | undefined;
    let boxEl: HTMLElement | undefined;

    const node = () => ed.tree.nodes[p.id];
    const hasChildren = () => node().children.length > 0;
    const isContainer = () => acceptsChildren(node());
    const mark = () => ed.marks[p.id];

    /** Цвет обводки узла: цветная метка доминирует, иначе — primary. */
    const colorOf = () => mark() ?? 'var(--primary)';

    /**
     * Единая подсветка бокса-контейнера через box-shadow (не border/outline —
     * не влияет на лайаут). Цвет всегда colorOf().
     */
    const boxStyle = (): JSX.CSSProperties | undefined => {
      const c = colorOf();
      if (spec() != null) {
        if (boxZone() === 'inside' || ed.dropTargetId === p.id)
          return { 'box-shadow': `inset 0 0 0 2px ${c}`, 'background-color': fill(c, 12) };
        if (insideCandidate())
          return { 'box-shadow': `inset 0 0 0 1px ${c}`, 'background-color': fill(c, 6) };
        if (mark())
          return { 'box-shadow': `inset 0 0 0 1px ${mark()}`, 'background-color': fill(mark()!, 8) };
        return undefined;
      }
      if (ed.selectedId === p.id)
        return { 'box-shadow': `inset 0 0 0 2px ${c}`, 'background-color': fill(c, 16) };
      if (mark())
        return { 'box-shadow': `inset 0 0 0 1px ${mark()}`, 'background-color': fill(mark()!, 8) };
      return undefined;
    };

    /** Зона контейнера по позиции курсора: кромки → before/after, иначе inside. */
    const containerZone = (s: DragSpec, clientY: number): TreeZone | null => {
      const tree = ed.tree;
      const sib = canBeside(tree, s, p.id);
      if (sib && headerEl && clientY < headerEl.getBoundingClientRect().top + EDGE) return 'before';
      if (sib && boxEl && clientY > boxEl.getBoundingClientRect().bottom - EDGE) return 'after';
      if (canInto(tree, s, p.id)) return 'inside';
      return sib ? 'after' : null;
    };

    /** Зона листа: пополам before/after (только сосед). */
    const leafZone = (s: DragSpec, ratioY: number): TreeZone | null => {
      if (!canBeside(ed.tree, s, p.id)) return null;
      return ratioY < 0.5 ? 'before' : 'after';
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
        const tree = ed.tree;
        return s != null && (canInto(tree, s, p.id) || canBeside(tree, s, p.id));
      },
      onDrop: (data, info) => {
        const s = dragSpec(data);
        if (!s) return;
        const zone = containerZone(s, info.pointer.y);
        if (!zone) return;
        emit('onTreeDragOver', { payload: { spec: s, targetId: p.id, zone } });
        const intent = ed.intent;
        if (intent) emit('onDrop', { payload: { spec: s, intent } });
      },
    });
    const leafDrop = createDroppable({
      id: `tree-leaf:${uid}`,
      disabled: () => isContainer(),
      accepts: (data) => {
        const s = dragSpec(data);
        return s != null && canBeside(ed.tree, s, p.id);
      },
      onDrop: (data, info) => {
        const s = dragSpec(data);
        if (!s) return;
        const zone = leafZone(s, info.ratio.y);
        if (!zone) return;
        emit('onTreeDragOver', { payload: { spec: s, targetId: p.id, zone } });
        const intent = ed.intent;
        if (intent) emit('onDrop', { payload: { spec: s, intent } });
      },
    });

    const setBoxRef = (el: HTMLElement): void => {
      boxEl = el;
      boxDrop.ref(el);
    };
    const setHeaderRef = (el: HTMLElement): void => {
      headerEl = el;
      drag.ref(el);
    };
    const setLeafRef = (el: HTMLElement): void => {
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
      return s != null && canInto(ed.tree, s, p.id);
    };

    // Двусторонний синк: пока курсор над ЭТОЙ строкой — эмитим onTreeDragOver.
    createEffect(() => {
      const s = spec();
      if (!s) return;
      if (!boxDrop.isOver() && !leafDrop.isOver()) return;
      const zone = boxZone() ?? leafLine();
      if (zone) {
        emit('onTreeDragOver', { payload: { spec: s, targetId: p.id, zone } });
      }
    });

    const Header = (props: { ref: (el: HTMLElement) => void }): JSX.Element => (
      <div
        ref={props.ref}
        onClick={() => emit('onSelect', { payload: p.id })}
        class="relative flex w-full min-w-0 cursor-grab items-center gap-1 rounded py-1 pr-1.5 text-sm hover:bg-accent/50"
        classList={{
          'opacity-40': drag.isDragging(),
        }}
        style={{
          'padding-left': `${p.depth * 12 + 4}px`,
          ...(ed.selectedId === p.id && !isContainer()
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
          {/* Цветная метка — chrome-аффорданс редактора.
              Dropdown из @capsuletech/web-ui (chrome-кит), НЕ из контент-кита. */}
          <span class="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
            <Dropdown>
              <Dropdown.Trigger
                data-dnd-cancel
                title="Цветная метка"
                class="block size-3.5 rounded-full border border-foreground/30"
                style={mark() ? { 'background-color': mark() } : undefined}
              />
              <Dropdown.Content class="flex items-center gap-1 p-1">
                <For each={MARK_COLORS}>
                  {(c) => (
                    <Dropdown.Item
                      class="size-4 cursor-pointer rounded-full p-0"
                      style={{ 'background-color': c }}
                      onSelect={() => {
                        emit('onMark', { payload: { nodeId: p.id, color: c } });
                      }}
                    />
                  )}
                </For>
                <Dropdown.Item
                  class="flex size-4 cursor-pointer items-center justify-center rounded-full border border-border p-0 text-foreground/60"
                  onSelect={() => {
                    emit('onMark', { payload: { nodeId: p.id, color: null } });
                  }}
                >
                  ×
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown>
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
        <Row id={ed.tree.root} depth={0} />
      </div>
    </div>
  );
};
