import { cva } from '@capsuletech/web-style';

/**
 * Separator внутри Group — визуальный разделитель.
 * Ориентация совпадает с ориентацией родительского Group.
 */
export const groupSeparatorVariants = cva('shrink-0 bg-border', {
  variants: {
    orientation: {
      horizontal: 'h-auto w-px self-stretch',
      vertical: 'h-px w-auto',
    },
  },
  defaultVariants: { orientation: 'horizontal' },
});
