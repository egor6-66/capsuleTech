/**
 * EditorOverlay — edit-decoration компонент для одной ноды (ADR 032, фаза 5).
 *
 * Монтируется рендерером (`<Renderer editOverlay={EditorOverlay} />`) ВНУТРИ
 * бокса каждой ноды (`position:absolute; inset:0`). Размер = размер ноды из CSS,
 * без замеров и ResizeObserver.
 *
 * Читает состояние из `useCtx().store.ctx` (typed как IEditorCtx). На клик
 * эмитит `onSelect` через `useEmit` — никакого прямого вызова store'а.
 *
 * Портировано из `apps/ui-creator/src/widgets/canvas.tsx:CanvasOverlay`.
 * Исходник имел прямые вызовы `editor.setSelectedId()` через `useEditor()` —
 * здесь заменены на `emit('onSelect', { payload: nodeId })`.
 *
 * Z-index: глубже нода → больше z-index → оверлей вложенной ноды поверх
 * родительского → корректный innermost-select под курсором.
 *
 * Pointer-events: в покое — `auto` (клики доходят сюда, не до компонентов);
 * во время drag — `none` (не мешаем DnD).
 */

import { useEmit } from '@capsuletech/web-core';
import type { IEditOverlayProps } from '@capsuletech/web-renderer';
import { Show } from 'solid-js';
import { canInto } from '../state/dnd';
import type { IEditorCtx } from './EditorController';
import { useEditor } from './useEditor';

/** Полупрозрачная заливка из цвета (hex, CSS-переменная, etc.). */
const fill = (c: string, pct: number): string =>
  `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/**
 * Определяет, является ли нода горизонтальным контейнером — по модели, без DOM.
 *
 * - ui.Layout.Flex + direction row/row-reverse → горизонталь
 * - ui.Layout.Grid + cols > 1 (числом или строкой с несколькими треками) → горизонталь
 * - Всё остальное → вертикаль
 */
const isRowLayout = (node: IEditOverlayProps['node']): boolean => {
  const props = node.props ?? {};
  if (node.type === 'ui.Layout.Flex') {
    const dir = props.direction as string | undefined;
    return dir === 'row' || dir === 'row-reverse';
  }
  if (node.type === 'ui.Layout.Grid') {
    const cols = props.cols;
    if (typeof cols === 'number') return cols > 1;
    if (typeof cols === 'string') {
      return cols.trim().split(/\s+/).length > 1 || cols.includes('repeat(');
    }
    return false;
  }
  return false;
};

/**
 * EditorOverlay — компонент, который app передаёт в
 * `<Renderer editOverlay={EditorOverlay} />`.
 *
 * Принимает `{ nodeId, node }` по контракту `IEditOverlayProps` (ADR 031).
 * Читает `useCtx().store.ctx` (typed IEditorCtx).
 * Эмитит `onSelect` через `useEmit`.
 */
export const EditorOverlay = (p: IEditOverlayProps) => {
  const { nodeId, node } = p;

  // ControllerContext доступен, т.к. EditorOverlay монтируется рендерером
  // в том же owner-tree, где уже живёт <Controllers.Editor> (app-Widget).
  const ctx = useEditor();
  const emit = useEmit();

  // store.ctx.data содержит IEditorCtx (XState кладёт schema.context в context.data).
  // useEditor() типизирован через createUseCtx<IEditorCtx>() — ctx.store.ctx.data: any,
  // каст to IEditorCtx безопасен (any → конкретный тип, без TS2352).
  const editorCtx = () => ctx.store.ctx.data as IEditorCtx;

  /** Цвет ноды: метка доминирует над primary. */
  const color = (): string => editorCtx().marks[nodeId] ?? 'var(--primary)';
  const marked = (): boolean => editorCtx().marks[nodeId] != null;
  const hasDrag = (): boolean => editorCtx().dragSpec != null;

  /**
   * Глубина узла в дереве → z-index оверлея.
   * Чем глубже нода, тем выше индекс → вложенный оверлей поверх родительского
   * → корректный innermost-select + компоненты под ним инертны.
   */
  const depth = (): number => {
    const t = editorCtx().tree;
    let d = 0;
    let cur: string | null = node.parentId;
    while (cur != null) {
      d++;
      cur = t.nodes[cur]?.parentId ?? null;
    }
    return d;
  };

  /**
   * box-shadow для обводки (inset — не сдвигает раскладку, не border).
   * drag-режим перекрывает idle-режим полностью.
   */
  const ringStyle = (): string | undefined => {
    const c = color();
    const s = editorCtx().dragSpec;
    const t = editorCtx().tree;
    if (s) {
      if (editorCtx().dropTargetId === nodeId) return `inset 0 0 0 2px ${c}`;
      if (canInto(t, s, nodeId)) return `inset 0 0 0 1px ${c}`;
      if (marked()) return `inset 0 0 0 1px ${c}`;
      return undefined;
    }
    if (editorCtx().selectedId === nodeId) return `inset 0 0 0 2px ${c}`;
    if (marked()) return `inset 0 0 0 1px ${c}`;
    return undefined;
  };

  const bgStyle = (): string | undefined => {
    const c = color();
    const s = editorCtx().dragSpec;
    if (s) {
      if (editorCtx().dropTargetId === nodeId) return fill(c, 12);
      if (marked()) return fill(c, 6);
      return undefined;
    }
    if (editorCtx().selectedId === nodeId) return fill(c, 14);
    if (marked()) return fill(c, 6);
    return undefined;
  };

  /**
   * Линия-вставки:
   *  - intent.beforeId === nodeId → полоса на лидирующей кромке
   *  - intent.parentId === nodeId && beforeId === null → полоса на хвостовой кромке
   */
  const insertionSide = (): 'leading' | 'trailing' | null => {
    const it = editorCtx().intent;
    if (!it) return null;
    if (it.beforeId === nodeId) return 'leading';
    if (it.parentId === nodeId && it.beforeId === null) return 'trailing';
    return null;
  };

  const insertionIsRow = (): boolean => {
    const it = editorCtx().intent;
    if (!it) return false;
    const parentNode = editorCtx().tree.nodes[it.parentId];
    return parentNode ? isRowLayout(parentNode) : false;
  };

  const lineClass = (side: 'leading' | 'trailing', row: boolean): string => {
    if (row) {
      return side === 'leading'
        ? 'pointer-events-none absolute inset-y-0 -left-px w-0.5 rounded'
        : 'pointer-events-none absolute inset-y-0 -right-px w-0.5 rounded';
    }
    return side === 'leading'
      ? 'pointer-events-none absolute inset-x-0 -top-px h-0.5 rounded'
      : 'pointer-events-none absolute inset-x-0 -bottom-px h-0.5 rounded';
  };

  return (
    <>
      {/* База: клик-перехватывающий слой. z-index=depth → глубокая нода первой ловит клик.
          Во время drag — pointer-events:none, не мешаем DnD-drop. */}
      <div
        class="absolute inset-0 cursor-pointer rounded-sm"
        style={{
          'z-index': `${depth()}`,
          'pointer-events': hasDrag() ? 'none' : 'auto',
          'box-shadow': ringStyle(),
          'background-color': bgStyle(),
        }}
        onClick={(e) => {
          e.stopPropagation();
          // toggle: повторный клик по той же ноде снимает выделение
          emit('onSelect', { payload: nodeId });
        }}
      />
      <Show when={insertionSide()}>
        {(side) => (
          <div
            class={lineClass(side(), insertionIsRow())}
            style={{ 'background-color': color(), 'z-index': '9999' }}
          />
        )}
      </Show>
    </>
  );
};
