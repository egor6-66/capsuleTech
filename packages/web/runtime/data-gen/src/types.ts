/**
 * Canonical JSON-UI-tree shape.
 *
 * `IEditorTree` / `IEditorNode` / `NodeId` are the shape consumed by both
 * `@capsuletech/web-renderer` (runtime render) and editing tools
 * (`@capsuletech/web-studio` JSON-tree ops). Owned here so apps that need
 * tree generation without studio can consume directly.
 */
export type NodeId = string;

/**
 * Один узел дерева UI. Полностью описывает один JSX-узел в формате,
 * совместимом с `@capsuletech/web-renderer` (`ISchema.components.nodes[id]`).
 *
 * Никакого UI-state'а (selected/expanded/etc.) — это отдельный концерн
 * редактора и хранится вне дерева.
 */
export interface IEditorNode {
  id: NodeId;
  /** Dot-path в registry, напр. `'ui.Button'`. */
  type: string;
  parentId: NodeId | null;
  /** Порядок имеет значение — массив, а не Set. */
  children: NodeId[];
  props: Record<string, unknown>;
  meta: Record<string, unknown>;
  styles: Record<string, string>;
}

export interface IEditorTree {
  root: NodeId;
  nodes: Record<NodeId, IEditorNode>;
}

// ─── Generator engine types ─────────────────────────────────────────────────

/** Refiner для пропсов после fuzz'инга — для зависимых полей (placeholder от label). */
export type IPropsRefiner = (props: Record<string, unknown>) => Record<string, unknown>;

/**
 * Один кандидат для слота. `type` — dot-path в реестре манифестов. Опц.
 * `weight` (default 1) — относительная вероятность выбора среди siblings.
 * Опц. `slots` — рекурсивная грамматика для детей. `refineProps` —
 * пост-обработка пропсов (например `placeholder` от `label`).
 */
export interface ISlotPick {
  type: string;
  weight?: number;
  slots?: readonly ISlotRule[];
  refineProps?: IPropsRefiner;
}

/**
 * Описание одного слота (потомка) внутри узла preset'а. Engine читает rule
 * и решает сколько детей вставить, какого типа, в каком порядке.
 */
export interface ISlotRule {
  /** Имя слота (для отладки/логов; в дерево не попадает). */
  name: string;
  /** Вероятность что слот появится. Default 1 (всегда). */
  probability?: number;
  /** Диапазон [min, max] количества детей. Default [1, 1]. */
  countRange?: readonly [number, number];
  /** Кандидаты-типы детей. Engine для каждого ребёнка делает pickWeighted. */
  pick: readonly ISlotPick[];
}

/**
 * Полный preset — root (с весами выбора) + рекурсивные слоты-дети.
 */
export interface IPreset {
  /** Имя preset'а (для отладки). */
  name: string;
  /** Кандидаты для root-ноды. Engine выбирает один. */
  rootCandidates: readonly ISlotPick[];
}

/**
 * Минимальный shape того, что engine ждёт от manifest'а узла. Consumer
 * (apps/studio) приносит свой реестр и резолвер; engine остаётся pure.
 */
export interface IManifestLike {
  /**
   * Zod-схема props компонента. Используется fuzzer'ом для random-заполнения.
   * Тип open (any) сознательно — data-gen не должен hardcode зависеть на
   * конкретный zod-вариант; resolver приносит уже совместимую схему.
   */
  // biome-ignore lint/suspicious/noExplicitAny: см. doc-комментарий выше
  propsSchema?: any;
  /** Дефолтные props (override'ы для fuzzer'а). */
  defaultProps?: Record<string, unknown>;
}

/** Резолвер manifest'а по dot-path типу узла. Если возвращает undefined — engine fallback'нётся на пустые props. */
export type IManifestResolver = (type: string) => IManifestLike | undefined;

export interface IGenerateOptions {
  /** Seed для воспроизводимости. Если не задан И rng не задан — `Date.now()`. */
  seed?: number;
  /** Кастомный RNG. Если задан — игнорит `seed`. */
  rng?: () => number;
  /**
   * Опциональный резолвер manifest'ов. Если задан — engine читает propsSchema
   * + defaultProps и fuzz'ит их. Если не задан — узлы создаются с пустыми props.
   *
   * Apps / studio инжектят свой реестр (например studio'шный `getManifest`).
   */
  resolveManifest?: IManifestResolver;
}
