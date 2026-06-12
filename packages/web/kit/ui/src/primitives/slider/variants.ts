import { cva } from '@capsuletech/web-style';

/**
 * Root container — sets up relative positioning for the track and provides
 * `data-orientation` / `data-disabled` attributes from Kobalte.
 */
export const sliderRootCva = cva(
  'relative flex w-full touch-none select-none flex-col gap-1 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Track — the full bar the thumb slides along.
 * `bg-muted` matches the inactive color used for toggles and inputs.
 */
export const sliderTrackCva = cva(
  'relative h-2 w-full grow rounded-full bg-secondary overflow-hidden',
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Fill — the colored portion of the track from start to thumb position.
 * Kobalte sets `left` / `right` via inline style depending on orientation.
 * `bg-primary` ties fill color to the accent token used for toggle / button.
 */
export const sliderFillCva = cva('absolute h-full bg-primary rounded-full', {
  variants: {},
  defaultVariants: {},
});

/**
 * Thumb — the draggable circular handle.
 * - `bg-background` + `border-border` keeps it neutral across light/dark themes.
 * - `ring-ring` on focus mirrors the focus ring of Input / Toggle.
 * - `shadow-sm` gives a subtle lift consistent with other interactive controls.
 */
export const sliderThumbCva = cva(
  [
    'block size-4 rounded-full',
    'border-2 border-primary bg-background',
    'shadow-sm',
    // Pointer affordance — the thumb is grab-draggable
    'cursor-pointer',
    'transition-[box-shadow] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:cursor-not-allowed',
  ].join(' '),
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Label row — flex container for label text + optional value display.
 */
export const sliderLabelRowCva = cva(
  'flex items-center justify-between gap-2 text-sm text-foreground',
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Value display — monospaced so digits don't jump width.
 */
export const sliderValueCva = cva(
  'font-mono text-xs tabular-nums text-muted-foreground',
  {
    variants: {},
    defaultVariants: {},
  },
);
