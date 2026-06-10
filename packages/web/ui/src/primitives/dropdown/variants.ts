import { cva } from '@capsuletech/web-style';

/**
 * Popover panel that contains the dropdown items.
 * Uses `bg-popover` + `text-popover-foreground` so it adapts to any theme.
 *
 * Enter + exit animations are driven by the `popover-animate` class (web-style
 * `@keyframes popover-in`/`popover-out`) keyed off Kobalte's `data-[expanded]` /
 * `data-[closed]` attributes — applies to both `Content` and `SubContent`.
 */
export const dropdownContentCva = cva(
  // No panel padding (canon shared with Select): rows run edge-to-edge so their
  // highlight spans the full width; content inset lives on the row itself.
  // `overflow-hidden` clips the rounded corners against full-bleed rows.
  'z-50 min-w-32 max-h-[var(--kb-popper-content-available-height)] overflow-y-auto overflow-x-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none focus:outline-none focus-visible:outline-none',
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Canonical menu row — the single source of truth for the height / padding /
 * highlight of every row in a dropdown (items, sub-triggers, `Dropdown.Row`).
 * Full-bleed (no rounding, no horizontal panel padding) so the highlight spans
 * the whole panel width, mirroring the Select option rows. `px-2` is the content
 * inset; `py-1.5` fixes a uniform row height regardless of content (text, icon,
 * or a trailing toggle).
 *
 * `data-[highlighted]` is set by Kobalte on keyboard/hover focus; `data-[disabled]`
 * when the `disabled` prop is true.
 */
export const dropdownRowCva = cva(
  'relative flex w-full cursor-default select-none items-center gap-2 px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Individual interactive row inside the dropdown. Alias of {@link dropdownRowCva}
 * kept for the existing `Dropdown.Item` / `Dropdown.SubTrigger` call sites.
 */
export const dropdownItemCva = dropdownRowCva;

/**
 * Horizontal rule divider between item groups.
 */
export const dropdownSeparatorCva = cva('-mx-1 my-1 h-px bg-border', {
  variants: {},
  defaultVariants: {},
});

/**
 * Non-interactive group label shown above a set of related items.
 */
export const dropdownLabelCva = cva('px-2 py-1.5 text-xs font-medium text-muted-foreground', {
  variants: {},
  defaultVariants: {},
});
