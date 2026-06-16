import { cva } from '@capsuletech/web-style';

/**
 * Root accordion wrapper.
 *
 * `divide-y divide-border` provides visual separators between sibling items.
 * `w-full` makes the accordion fill its parent block by default.
 *
 * For responsive multi-column layouts use the `fluid` prop on each Accordion
 * together with a parent `<Flex wrap='wrap'>` — same pattern as `Flex`'s own
 * `fluid` prop. When `fluid` is set, `w-full` is dropped automatically.
 */
export const accordionRootCva = cva('w-full divide-y divide-border', {
  variants: {},
  defaultVariants: {},
});

/**
 * Individual accordion section.
 */
export const accordionItemCva = cva('bg-muted/20', {
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
    'group flex w-full items-center justify-between cursor-pointer',
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
 * Uses keyframe animation via the `.accordion-animate` class (defined in
 * `@capsuletech/web-style` index.css). Kobalte waits for `animationend`
 * before unmounting the element, so keyframe-based animation works correctly
 * on collapse — unlike CSS `transition-[grid-template-rows]` which fires
 * after the element is already unmounted.
 *
 * Pattern mirrors `popover-animate` / `select-content-animate` used in
 * Dropdown.Content and Select.Content respectively.
 *
 * `data-[expanded]` / `data-[closed]` are toggled by Kobalte; the
 * `.accordion-animate` keyframes respond to those data-attributes for
 * expand and collapse animations.
 */
export const accordionContentCva = cva('accordion-animate', {
  variants: {},
  defaultVariants: {},
});

/**
 * Inner content wrapper ensures `min-height: 0` so the grid can collapse.
 */
export const accordionContentInnerClass = 'min-h-0 text-sm text-muted-foreground';
