/**
 * Row — одна строка Editor.Tree (лист или контейнер-бокс).
 *
 * Layout: Flex из @capsuletech/web-ui/flex.
 * Чеврон-кнопка: Button variant="ghost" size="icon" из @capsuletech/web-ui/button.
 * Иконка чеврона: ChevronRight из @capsuletech/web-ui/icons (rotate-90 = открыт).
 *
 * DnD: createDraggable/createDroppable из @capsuletech/web-dnd — прямые (per-row ref).
 * Зоны: containerZone/leafZone/insideCandidate из ./zones (pure-импорты).
 * Подсветка: boxStyle/headerStyle/colorOf из ./highlight.
 * Метки: MarkPicker из ./MarkPicker.
 * Label/icon: label/icon из ./utils.
 */

import { createDraggable, createDroppable, useDnD } from '@capsuletech/web-dnd';
import { useEmit } from '@capsuletech/web-core';
import { Button } from '@capsuletech/web-ui/button';
import { Flex } from '@capsuletech/web-ui/flex';
import { ChevronRight } from '@capsuletech/web-ui/icons';
import { createEffect, createSignal, createUniqueId, For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import { acceptsChildren } from '../../manifests/rules';
import { dragSpec, type DragSpec } from '../../state/dnd';
import { canBeside, canInto } from '../../state/dnd';
import type { IUseEditorResult } from '../useEditor';
import { boxStyle, colorOf, headerStyle } from './highlight';
import { MarkPicker } from './MarkPicker';
import { containerZone, insideCandidate, leafZone } from './zones';
import { icon, label } from './utils';

export interface IRowProps {
  id: string;
  depth: number;
  ed: IUseEditorResult;
  /** Глобальный spec активного drag (из useDnD). */
  spec: () => DragSpec | null;
  /** collapsed-state + toggle из EditorTree. */
  isCollapsed: (id: string) => boolean;
  toggle: (id: string) => void;
}

export const Row = (p: IRowProps): JSX.Element => {
  const uid = createUniqueId();
  let headerEl: HTMLElement | undefined;
  let boxEl: HTMLElement | undefined;

  const emit = useEmit();
  const dnd = useDnD();

  const node = () => p.ed.tree.nodes[p.id];
  const hasChildren = () => node().children.length > 0;
  const isContainer = () => acceptsChildren(node());
  const mark = () => p.ed.marks[p.id];
  const color = () => colorOf(mark());

  const currentBoxZone = (): ReturnType<typeof containerZone> => {
    if (!boxDrop.isOver()) return null;
    const s = p.spec();
    const pt = dnd.state.pointer();
    if (!s || !pt || !headerEl || !boxEl) return null;
    return containerZone(
      p.ed.tree,
      s,
      p.id,
      pt.y,
      headerEl.getBoundingClientRect().top,
      boxEl.getBoundingClientRect().bottom,
    );
  };

  const currentLeafLine = (): ReturnType<typeof leafZone> => {
    if (!leafDrop.isOver()) return null;
    const s = p.spec();
    const pt = dnd.state.pointer();
    if (!s || !pt || !headerEl) return null;
    const r = headerEl.getBoundingClientRect();
    return leafZone(p.ed.tree, s, p.id, r.height ? (pt.y - r.top) / r.height : 0.5);
  };

  const isInsideCandidate = (): boolean => {
    const s = p.spec();
    return s != null && insideCandidate(p.ed.tree, s, p.id);
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
      return s != null && (canInto(p.ed.tree, s, p.id) || canBeside(p.ed.tree, s, p.id));
    },
    onDrop: (data, info) => {
      const s = dragSpec(data);
      if (!s || !headerEl || !boxEl) return;
      const zone = containerZone(
        p.ed.tree,
        s,
        p.id,
        (info as { pointer: { y: number } }).pointer.y,
        headerEl.getBoundingClientRect().top,
        boxEl.getBoundingClientRect().bottom,
      );
      if (!zone) return;
      emit('onTreeDragOver', { payload: { spec: s, targetId: p.id, zone } });
      const intent = p.ed.intent;
      if (intent) emit('onDrop', { payload: { spec: s, intent } });
    },
  });

  const leafDrop = createDroppable({
    id: `tree-leaf:${uid}`,
    disabled: () => isContainer(),
    accepts: (data) => {
      const s = dragSpec(data);
      return s != null && canBeside(p.ed.tree, s, p.id);
    },
    onDrop: (data, info) => {
      const s = dragSpec(data);
      if (!s || !headerEl) return;
      const r = headerEl.getBoundingClientRect();
      const ratio = r.height
        ? ((info as { pointer: { y: number } }).pointer.y - r.top) / r.height
        : 0.5;
      const zone = leafZone(p.ed.tree, s, p.id, ratio);
      if (!zone) return;
      emit('onTreeDragOver', { payload: { spec: s, targetId: p.id, zone } });
      const intent = p.ed.intent;
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

  // Двусторонний синк: пока курсор над ЭТОЙ строкой — эмитим onTreeDragOver.
  createEffect(() => {
    const s = p.spec();
    if (!s) return;
    if (!boxDrop.isOver() && !leafDrop.isOver()) return;
    const zone = currentBoxZone() ?? currentLeafLine();
    if (zone) {
      emit('onTreeDragOver', { payload: { spec: s, targetId: p.id, zone } });
    }
  });

  const HeaderContent = (innerProps: { ref: (el: HTMLElement) => void }): JSX.Element => (
    <div
      ref={innerProps.ref}
      onClick={() => emit('onSelect', { payload: p.id })}
      class="relative flex w-full min-w-0 cursor-grab items-center gap-1 rounded py-1 pr-1.5 text-sm hover:bg-accent/50"
      classList={{ 'opacity-40': drag.isDragging() }}
      style={{
        'padding-left': `${p.depth * 12 + 4}px`,
        ...headerStyle({
          isSelected: p.ed.selectedId === p.id,
          isContainer: isContainer(),
          mark: mark(),
          color: color(),
        }),
      }}
    >
      <Show when={currentLeafLine() === 'before'}>
        <div class="pointer-events-none absolute inset-x-0 -top-px z-10 h-0.5 rounded bg-primary" />
      </Show>
      <Show when={currentLeafLine() === 'after'}>
        <div class="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-0.5 rounded bg-primary" />
      </Show>
      <Show
        when={hasChildren()}
        fallback={<span class="size-4 shrink-0" />}
      >
        <Button
          variant="ghost"
          size="icon"
          data-dnd-cancel
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            p.toggle(p.id);
          }}
          aria-label={p.isCollapsed(p.id) ? 'Развернуть' : 'Свернуть'}
          class="size-4 shrink-0 text-foreground/40 transition-transform hover:text-foreground"
          classList={{ 'rotate-90': !p.isCollapsed(p.id) }}
        >
          <ChevronRight size={12} aria-hidden="true" />
        </Button>
      </Show>
      <span class="shrink-0 text-foreground/50">{icon(node().type)?.()}</span>
      <span class="truncate">{label(node().type)}</span>
      <Show when={isContainer()}>
        <MarkPicker
          nodeId={p.id}
          mark={mark()}
          onMark={(nodeId, c) => emit('onMark', { payload: { nodeId, color: c } })}
        />
      </Show>
    </div>
  );

  // Лист — просто строка.
  if (!isContainer()) return <HeaderContent ref={setLeafRef} />;

  // Контейнер — бокс (заголовок + блок детей), droppable на всём боксе.
  return (
    <div
      ref={setBoxRef}
      class="relative overflow-hidden rounded pb-1"
      style={boxStyle({
        spec: p.spec(),
        boxZone: currentBoxZone(),
        isDropTarget: p.ed.dropTargetId === p.id,
        isInsideCandidate: isInsideCandidate(),
        mark: mark(),
        selectedId: p.ed.selectedId,
        nodeId: p.id,
      })}
    >
      <Show when={currentBoxZone() === 'before'}>
        <div
          class="pointer-events-none absolute inset-x-0 -top-px z-10 h-0.5 rounded"
          style={{ 'background-color': color() }}
        />
      </Show>
      <Show when={currentBoxZone() === 'after'}>
        <div
          class="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-0.5 rounded"
          style={{ 'background-color': color() }}
        />
      </Show>
      <HeaderContent ref={setHeaderRef} />
      <Show when={hasChildren() && !p.isCollapsed(p.id)}>
        <For each={node().children}>
          {(cid) => (
            <Row
              id={cid}
              depth={p.depth + 1}
              ed={p.ed}
              spec={p.spec}
              isCollapsed={p.isCollapsed}
              toggle={p.toggle}
            />
          )}
        </For>
      </Show>
      <Show when={!hasChildren()}>
        <Flex
          orientation="horizontal"
          class="text-xs italic text-foreground/30"
          style={{ 'padding-left': `${(p.depth + 1) * 12 + 4}px` }}
        >
          пусто
        </Flex>
      </Show>
    </div>
  );
};
