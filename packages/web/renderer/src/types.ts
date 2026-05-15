import type { Component } from 'solid-js';

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

/**
 * Монотонная шкала возможностей. Каждый следующий мод — строгий супер-сет
 * предыдущего, чтобы апгрейд не ломал JSON.
 */
export type RenderMode =
  | 'static' //     только components; interactions игнорируются
  | 'controlled' // + interactions.ref на готовые Controllers/Features (v1)
  | 'full'; //      + interactions.inline JSON FSM-конфиг (v1.2+, пока not implemented)

/**
 * Registry — объект, в котором renderer резолвит компоненты по dot-path'у.
 * Структура произвольная (renderer просто ходит по ключам), но обычно
 * выглядит так:
 *
 *   {
 *     ui: { Button, Input, Field, Layout, ... },
 *     Entities: { Viewer: { LoginForm } },
 *     Widgets: { Forms: { Auth } },
 *     Controllers: { Universal: { Form } },
 *     Features: { ... },
 *   }
 *
 * Renderer-у всё равно, как именно — он использует `node.type` как путь.
 */
export type Registry = Record<string, any>;

export interface IRendererProps {
  schema: ISchema;
  registry: Registry;
  /** Default: `'controlled'`. */
  mode?: RenderMode;
  /** Fallback для нерезолвящихся типов (вместо тихого пропуска). */
  fallback?: Component<{ type: string; nodeId: NodeId }>;
}
