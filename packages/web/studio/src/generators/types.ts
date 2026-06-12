import type { IEditorNode, IEditorTree, NodeId } from '../state/types';

export type { IEditorNode, IEditorTree, NodeId };

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

export interface IGenerateOptions {
  /** Seed для воспроизводимости. Если не задан И rng не задан — `Date.now()`. */
  seed?: number;
  /** Кастомный RNG. Если задан — игнорит `seed`. */
  rng?: () => number;
}
