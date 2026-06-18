/**
 * Schema types for the JSON-tree renderer protocol.
 *
 * Canonically lives in @capsuletech/web-contract so that kit manifests
 * and other consumers can reference ISchema without depending on the
 * renderer package. @capsuletech/web-renderer re-exports these for
 * back-compat.
 *
 * Zero-dep — no solid-js, no runtime imports.
 */

/** Stable identifier for a node in the component tree. */
export type NodeId = string;

/**
 * Один узел дерева. Stateless — никаких флагов вроде `new`/`selected`
 * (это editor-UI концерн, не runtime).
 */
export interface IEditorNode {
  id: NodeId;
  /** Dot-path в registry. Напр. `'ui.Button'`, `'ui.Field.Label'`, `'Entities.Viewer.LoginForm'`. */
  type: string;
  parentId: NodeId | null;
  /** Порядок имеет значение — массив, а не Set. */
  children: NodeId[];
  props?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  styles?: Record<string, string>;
}

/**
 * Привязка поведения к поддереву. Сейчас поддерживается только `ref` — ссылка
 * на готовый Controller/Feature из реестра (e.g. `'Controllers.Universal.Form'`).
 *
 * `inline` декларирован сразу, чтобы пользователи могли его генерировать,
 * но в моде `controlled` он игнорируется с dev-warning'ом. Будет включён в
 * `full` (v1.2) когда появится `createControllerFromConfig`.
 */
export interface IInteraction {
  id: string;
  /** К какому поддереву прикручено (узел и его потомки). */
  nodeId: NodeId;
  kind: 'controller' | 'feature';
  /** Dot-path в registry, напр. `'Controllers.Universal.Form'`. */
  ref?: string;
  /** Пропсы для самого wrapper'а (e.g. `overrides` у Controller). */
  props?: Record<string, unknown>;
  /** XState-config в JSON. Активируется только в моде `full`. */
  inline?: Record<string, unknown>;
}

export interface ISchema {
  components: {
    root: NodeId;
    nodes: Record<NodeId, IEditorNode>;
  };
  interactions?: IInteraction[];
}
