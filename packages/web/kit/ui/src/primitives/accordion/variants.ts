import { cva } from '@capsuletech/web-style';

/**
 * Root accordion wrapper.
 * `divide-y` on the root creates a visual separator between items without
 * requiring explicit `<Separator>` elements.
 */
export const accordionRootCva = cva('w-full divide-y divide-border', {
  variants: {},
  defaultVariants: {},
});

/**
 * Individual accordion section.
 */
export const accordionItemCva = cva('', {
  variants: {},
  defaultVariants: {},
});

/**
 * Trigger button: full-width, flex row, label left + chevron right.
 *
 * `data-[expanded]` — set by Kobalte on BOTH the Item (CollapsibleRoot) AND
 * the Trigger button itself (via CollapsibleTrigger → context.dataset()). We
 * must supply an explicit style for this state; without it the browser may
 * apply its native accent colour to `button[data-expanded]` or
 * `button[aria-expanded="true"]`, producing an unwanted bright background.
 *
 * `data-[disabled]` — set by Kobalte when `disabled` prop is `true`.
 *
 * The chevron SVG inside carries its own `group-aria-expanded:rotate-180` class
 * for the 180° rotation animation (Kobalte sets `aria-expanded` on the button).
 */
export const accordionTriggerCva = cva(
  [
    // `group` on the trigger button allows child elements (chevron) to detect
    // `aria-expanded` via `group-aria-expanded:*` Tailwind variant.
    // Kobalte sets `aria-expanded` directly on the Trigger button.
    'group flex w-full items-center justify-between',
    'px-4 py-3',
    'text-sm font-medium text-foreground',
    // Default: transparent background (no fill).
    'bg-transparent',
    // Hover: subtle accent tint — same language as Dropdown.Item highlighted state.
    'hover:bg-accent hover:text-accent-foreground',
    // Expanded (open): keep neutral — no primary fill. A very faint muted tint is
    // enough to distinguish the open header from collapsed siblings without looking
    // like a selected/active navigation item.
    'data-[expanded]:bg-muted/40 data-[expanded]:text-foreground',
    'transition-colors duration-200',
    'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
  ].join(' '),
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Content panel.
 *
 * Uses the CSS `grid` trick for height animation — transition from
 * `grid-template-rows: 0fr` → `1fr` (no JS needed). Kobalte sets
 * `--kb-accordion-content-height` on this element.
 *
 * `data-[expanded]` / `data-[closed]` are toggled by Kobalte; the
 * outer grid container uses them via `data-[closed]:grid-rows-[0fr]`
 * and `data-[expanded]:grid-rows-[1fr]`.
 */
export const accordionContentCva = cva(
  [
    // Grid wrapper approach: transition max-height via grid-template-rows
    'grid overflow-hidden',
    'transition-[grid-template-rows] duration-300 ease-in-out',
    'data-[expanded]:grid-rows-[1fr]',
    'data-[closed]:grid-rows-[0fr]',
  ].join(' '),
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Inner content wrapper ensures `min-height: 0` so the grid can collapse.
 */
export const accordionContentInnerClass =
  'min-h-0 px-4 pb-4 pt-1 text-sm text-muted-foreground';
