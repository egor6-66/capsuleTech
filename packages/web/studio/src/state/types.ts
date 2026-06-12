/**
 * Tree shape is owned by `@capsuletech/data-gen` — single source of truth
 * for JSON-UI-tree across renderer/studio/apps. Studio re-exports here for
 * backwards-compatibility of internal imports.
 */
export type { IEditorNode, IEditorTree, NodeId } from '@capsuletech/data-gen';

/**
 * Полный контекст редактора. Кроме дерева — UI-state (выбранная нода).
 * Лежит в XState `context.data` через бридж.
 */
export interface IEditorContext {
  tree: IEditorTree;
  selectedId: NodeId | null;
}

/** Payload'ы для операций — типизированы отдельно для использования в Feature handlers. */
export interface IAddNodePayload {
  type: string;
  parentId: NodeId;
  /** Куда вставить среди детей родителя. По умолчанию — в конец. */
  index?: number;
  /** Опциональный override дефолтных пропсов из манифеста. */
  props?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface IMoveNodePayload {
  nodeId: NodeId;
  newParentId: NodeId;
  index?: number;
}

export interface IRemoveNodePayload {
  nodeId: NodeId;
}

export interface IUpdateNodePayload {
  nodeId: NodeId;
  patch: {
    props?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    styles?: Record<string, string>;
  };
}

export interface IReorderChildrenPayload {
  parentId: NodeId;
  newOrder: NodeId[];
}

export interface IInsertSubtreePayload {
  parentId: NodeId;
  /** Куда вставить root фрагмента среди детей родителя. По умолчанию — в конец. */
  index?: number;
}
