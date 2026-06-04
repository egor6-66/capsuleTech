/**
 * EditorController — HCA-Controller для визуального редактора (ADR 032, фаза 5).
 *
 * Инкапсулирует всё состояние редактора (tree/selection/drag/marks) + handlers
 * поверх resolver'ов из `/state` и `/manifests`. App-код просто монтирует
 * `<Controllers.Editor>` и читает `useCtx().store.ctx` через дочерние Widget'ы.
 *
 * Surface canvas vs tree: различаем через разные имена событий:
 *  - Canvas emits `onCanvasDragOver` / `onDrop` (с pointer для геометрического резолва)
 *  - Tree emits   `onTreeDragOver`   / `onDrop` (с targetId + zone)
 * Это позволяет виджетам оставаться тонкими (только проводка), а Controller'у —
 * знать, какой resolver применить.
 *
 * Мутации через `store.update({ field: value })`, чтение через `context.data.X`
 * (Bridge mutation API, docs/_meta/web-core.md).
 */

import { Controller } from '@capsuletech/web-core';
import {
  applyDrop,
  canInto,
  canvasIntent,
  dragSpec,
  treeIntent,
  type DragSpec,
  type DropIntent,
  type TreeZone,
} from '../state/dnd';
import type { IEditorTree, NodeId } from '../state/types';
import { createEmptyTree } from '../state/operations';

// ── Типы контекста ────────────────────────────────────────────────────────────

export interface IEditorCtx {
  tree: IEditorTree;
  selectedId: NodeId | null;
  dragSpec: DragSpec | null;
  dropTargetId: NodeId | null;
  intent: DropIntent | null;
  marks: Record<NodeId, string>;
}

// ── Типы payload'ов для handlers ──────────────────────────────────────────────

export interface IOnDragOverCanvasPayload {
  spec: DragSpec;
  pointer: { x: number; y: number };
}

export interface IOnDragOverTreePayload {
  spec: DragSpec;
  targetId: NodeId;
  zone: TreeZone;
}

export interface IOnDropPayload {
  spec: DragSpec;
  intent: DropIntent;
}

export interface IOnMarkPayload {
  nodeId: NodeId;
  color: string | null;
}

// ── Controller ────────────────────────────────────────────────────────────────

const EditorController = Controller((services) => {
  const initialCtx: IEditorCtx = {
    tree: createEmptyTree('ui.Layout.Grid'),
    selectedId: null,
    dragSpec: null,
    dropTargetId: null,
    intent: null,
    marks: {},
  };

  return {
    initial: 'idle',
    context: initialCtx,
    states: {
      idle: {
        /**
         * onSelect — toggle selectedId.
         * payload: NodeId | null
         */
        onSelect({ target, store, context }) {
          const nodeId = (target.payload as NodeId | null) ?? null;
          const current = context.selectedId;
          store.update({
            selectedId: current === nodeId ? null : nodeId,
          });
        },

        /**
         * onCanvasDragOver — геометрический резолв intent'а через cursor pointer.
         * payload: IOnDragOverCanvasPayload
         */
        onCanvasDragOver({ target, store, context }) {
          const { spec, pointer } = target.payload as IOnDragOverCanvasPayload;
          const it = canvasIntent(context.tree, spec, pointer.x, pointer.y);
          store.update({
            dragSpec: spec,
            dropTargetId: it?.parentId ?? null,
            intent: it,
          });
        },

        /**
         * onTreeDragOver — зональный резолв intent'а через строку дерева.
         * payload: IOnDragOverTreePayload
         */
        onTreeDragOver({ target, store, context }) {
          const { spec, targetId, zone } = target.payload as IOnDragOverTreePayload;
          const it = treeIntent(context.tree, spec, targetId, zone);
          store.update({
            dragSpec: spec,
            dropTargetId: targetId,
            intent: it,
          });
        },

        /**
         * onDrop — применить drop (add/move/reorder), сбросить drag-состояние.
         * payload: IOnDropPayload
         */
        onDrop({ target, store, context }) {
          const { spec, intent } = target.payload as IOnDropPayload;
          const newTree = applyDrop(context.tree, spec, intent);
          store.update({
            tree: newTree,
            dragSpec: null,
            dropTargetId: null,
            intent: null,
          });
        },

        /**
         * onDragEnd — отменить drag (Escape или выход за пределы drop-зон).
         */
        onDragEnd({ store }) {
          store.update({
            dragSpec: null,
            dropTargetId: null,
            intent: null,
          });
        },

        /**
         * onMark — установить/снять цветную метку ноды.
         * payload: IOnMarkPayload
         */
        onMark({ target, store, context }) {
          const { nodeId, color } = target.payload as IOnMarkPayload;
          const next = { ...context.marks };
          if (color) {
            next[nodeId] = color;
          } else {
            delete next[nodeId];
          }
          store.update({ marks: next });
        },

        /**
         * onSetTree — принудительно заменить всё дерево (например, при загрузке
         * схемы с сервера или применении preset'а).
         * payload: IEditorTree
         */
        onSetTree({ target, store }) {
          store.update({ tree: target.payload as IEditorTree });
        },

        /**
         * canInto — утилита для Canvas/Tree виджетов: проверить, можно ли
         * опустить spec в parentId. Возвращает boolean.
         *
         * Не мутирует store — pure read, удобно для accepts-callback'а DnD.
         * Вызывается напрямую через emit('canInto', { payload: { tree, spec, parentId } }).
         */
        canInto({ target, context }) {
          const { spec: s, parentId } = target.payload as { spec: DragSpec; parentId: NodeId };
          return canInto(context.tree, s, parentId);
        },
      },
    },
  };
});

export default EditorController;
