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
 *
 * Two independent opt-in flags (both off by default):
 * - `bordered` — outer stroke (`border`), so two accordions placed side by
 *   side / stacked stay visually distinct instead of merging into one flat
 *   surface.
 * - `rounded` — rounded corners (`rounded-md` + `overflow-hidden` so item
 *   corners clip to the radius).
 *
 * They compose freely: stroke-only, radius-only, both, or neither.
 */
export const accordionBorderClass = 'border border-border';
export const accordionRoundedClass = 'overflow-hidden rounded-md';
/**
 * Nested-level indent (`nested` prop). Replaces the raw `class="pl-3"` a
 * consumer would add to a sub-accordion — indenting a nested level is the
 * component's job, not the caller's.
 */
export const accordionNestedClass = 'pl-3';

export const accordionRootCva = cva('w-full divide-y divide-border', {
  variants: {
    bordered: {
      true: accordionBorderClass,
      false: '',
    },
    rounded: {
      true: accordionRoundedClass,
      false: '',
    },
  },
  defaultVariants: {
    bordered: false,
    rounded: false,
  },
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
    variants: {
      // Density controls vertical rhythm only (horizontal padding stays `px-4`
      // so labels line up across densities). `compact` mirrors the studio
      // palette's hand-tightened `py-2` trigger — now a first-class prop.
      density: {
        default: 'px-4 py-3',
        compact: 'px-4 py-2',
      },
    },
    defaultVariants: {
      density: 'default',
    },
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

/**
 * Trigger label as a column stack (title + muted caption). Applied only when
 * the `subtitle` prop is set — the "title over caption" group header is a
 * repeating pattern across reference accordions (Concepts / Rules), so its
 * layout lives inside the primitive instead of being copy-pasted by every
 * consumer. `min-w-0` keeps the stack shrinkable next to the chevron;
 * `text-left` overrides any inherited centring.
 */
export const accordionTriggerLabelStackClass = 'flex min-w-0 flex-col gap-0.5 text-left';
/** Muted caption row under the label in the stacked-trigger layout. */
export const accordionTriggerSubtitleClass = 'text-xs font-normal text-muted-foreground';
