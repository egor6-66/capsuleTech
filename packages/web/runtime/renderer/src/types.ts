import type { Component, JSX } from 'solid-js';

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
 * Registry — рекурсивный объект, в котором renderer резолвит компоненты по
 * dot-path'у. На каждом уровне значение — либо листовой `Component<any>`,
 * либо вложенный `Registry` (с произвольной глубиной). Обычно выглядит так:
 *
 *   {
 *     ui: { Button, Input, Field, Layout, ... },
 *     Entities: { Viewer: { LoginForm } },
 *     Widgets: { Forms: { Auth } },
 *     Controllers: { Universal: { Form } },
 *     Features: { ... },
 *   }
 *
 * `node.type = 'Entities.Viewer.LoginForm'` → renderer walks `Entities → Viewer
 * → LoginForm`. Если по пути что-то отсутствует или не-Component — `fallback`.
 *
 * **Контракт:** registry treated as immutable (per-registry кэш в resolve.ts).
 * **Тип-safety:** value на каждом ключе — Component или sub-Registry, никаких
 * сторонних значений (utils, констант и т.п.). Если хочется такого — держите
 * вне registry.
 */
export type Registry = { [key: string]: Component<any> | Registry };

/**
 * Аргументы errorFallback'а — что отрендерить при runtime-ошибке в компоненте.
 *
 * `reset` дёргает Solid'овский ErrorBoundary reset — компонент попытается
 * отрендериться заново (полезно если ошибка временная, e.g. недостающие
 * data в transient state).
 */
export interface IErrorFallbackProps {
  type: string;
  nodeId: NodeId;
  error: unknown;
  reset: () => void;
}

/**
 * Пропсы, которые рендерер передаёт в компонент `editOverlay` для каждой ноды.
 * Хост читает `nodeId` и `node` из editor-store, рисует chrome (обводка, подсветка,
 * drag-handle и т.п.) средствами CSS без единого замера геометрии.
 */
export interface IEditOverlayProps {
  nodeId: NodeId;
  node: IEditorNode;
}

export interface IRendererProps {
  schema: ISchema;
  registry: Registry;
  /** Default: `'controlled'`. */
  mode?: RenderMode;
  /** Fallback для нерезолвящихся типов (вместо тихого пропуска). */
  fallback?: Component<{ type: string; nodeId: NodeId }>;
  /**
   * Fallback при runtime-ошибке внутри компонента ноды. Применяется per-RenderNode
   * (sibling isolation). Default: `console.error` + `null`.
   */
  errorFallback?: Component<IErrorFallbackProps>;
  /** Fallback для верхнеуровневого `<Suspense>` (lazy-children и т.п.). */
  loadingFallback?: JSX.Element;
  /**
   * Если задан — рендерер в «edit-decoration» режиме: для каждой ноды подвешивает
   * overlay-слот (`position:absolute; inset:0` внутри бокса ноды), в который хост
   * рисует editor-chrome (обводка/заливка/ловля событий).
   *
   * Ортогонален `mode` — НЕ вводит новый RenderMode. `mode` управляет шкалой
   * interaction-возможностей (static|controlled|full); `editOverlay` управляет
   * только decoration-слоем. Оба параметра независимы и комбинируемы.
   *
   * Отсутствует → обычный рендер; путь выполнения не меняется.
   */
  editOverlay?: Component<IEditOverlayProps>;
}
