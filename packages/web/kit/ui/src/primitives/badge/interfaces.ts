import type { VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';

import type { badgeCva } from './badge.presets';

export type BadgeVariants = VariantProps<typeof badgeCva>;

/**
 * IBadgeProps — stateless, пресет-driven бейдж/чип.
 *
 * Один компонент — два подвида:
 * - статическая inline-пилюля (по умолчанию),
 * - кликабельный чип (`interactive`) с `selected`-подсветкой.
 *
 * Классы легитимны ТОЛЬКО внутри компонента: consumer передаёт props/пресеты,
 * ноль сырых классов (`class?` — необязательный passthrough).
 */
export interface IBadgeProps extends BadgeVariants {
  /** Содержимое бейджа — лейбл/тег. `#`-префикс тега — забота потребителя (контент). */
  children: JSX.Element;
  /**
   * Визуальный тон (пресет). Default — `'muted'`.
   * @see badgeCva
   */
  tone?: NonNullable<BadgeVariants['tone']>;
  /** Плотность. Default — `'sm'`. */
  size?: NonNullable<BadgeVariants['size']>;
  /**
   * Кликабельный чип (rule/word-chip): `role="button"` + tabIndex + onClick +
   * Enter/Space + `selected`-подсветка + `aria-pressed`. Default — `false`.
   */
  interactive?: boolean;
  /** Подсветка активного чипа — только при `interactive`. */
  selected?: boolean;
  /** Клик по чипу — только при `interactive`. */
  onClick?: (e: MouseEvent) => void;
  class?: string;
}
