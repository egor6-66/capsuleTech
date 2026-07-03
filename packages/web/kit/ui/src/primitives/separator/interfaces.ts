import type { SeparatorRootProps } from '@kobalte/core/separator';
import type { VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';
import type { separatorCva } from './variants';

// Используем прямой VariantProps, чтобы избежать проблем с StyleVariants
export interface ISeparatorProps extends SeparatorRootProps {
  variant?: VariantProps<typeof separatorCva>['variant'];
  /**
   * `true` (default) — чисто визуальный разделитель: `role="none"` убирает
   * элемент из a11y-дерева; `false` — смысловой separator (имплицитная роль
   * `<hr>`). Семантика Radix/shadcn, реализована в обёртке — у Kobalte 0.13
   * такой опции нет, в DOM проп не форвардится.
   */
  decorative?: boolean;
  class?: string;
  style?: JSX.CSSProperties | string;
}
