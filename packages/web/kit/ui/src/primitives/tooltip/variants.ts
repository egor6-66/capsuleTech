import { cva } from '@capsuletech/web-style';

/**
 * Tooltip panel styles.
 *
 * Uses the same `bg-popover` + `text-popover-foreground` tokens as
 * `dropdownContentCva` so the panel adapts to any theme automatically.
 * Intentionally more compact than Dropdown.Content — no `min-w`, tighter
 * padding, slightly smaller radius — tooltip is a hint, not a menu.
 */
export const tooltipContentCva = cva(
  'z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md outline-none',
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Arrow element rendered inside the tooltip panel — a small rotated square.
 * `bg-popover` matches the panel background so it reads as a notch pointing
 * toward the anchor. Positioned inline by `Tooltip.Arrow` based on the
 * resolved side.
 */
export const tooltipArrowCva = cva('bg-popover', {
  variants: {},
  defaultVariants: {},
});
