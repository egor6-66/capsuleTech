import { cva } from '@capsuletech/web-style';

/**
 * Inlined INPUT_FIELD_BASE — tokens live in `@capsuletech/web-style`;
 * this string is a local aggregation for CVA. Kept in sync with
 * primitives/input/variants.ts and primitives/select/variants.ts.
 */
const INPUT_FIELD_BASE = [
  // Layout & sizing — common to all three controls
  'flex w-full rounded-md border border-input text-sm shadow-sm',
  // Horizontal padding shared by all three; height controlled per-control
  'px-input',
  // Transition covers bg, border colour, and box-shadow (ring)
  'transition-[background-color,border-color,box-shadow] duration-200',
  // Background state 1: empty
  'bg-transparent',
  // Suppress native outline; the active ring is supplied per-control
  'outline-none',
  // Placeholder
  'placeholder:text-muted-foreground',
  // Disabled
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

export const variants = {
  variant: {
    default: '',
  },
  size: {
    // sm/lg override only py — base already carries px-input; twMerge resolves
    sm: 'py-1 text-xs',
    default: 'text-sm',
    lg: 'py-3 text-base',
  },
} as const;

export const textareaCva = cva(
  [
    INPUT_FIELD_BASE,
    // Textarea-specific: multiline, no fixed height; py-input from base was removed
    // (base now carries px-input only), so we restore vertical padding here.
    'py-input',
    // Textarea-specific layout
    'min-h-[80px] text-foreground',
    // Background state 2: filled (data-filled set by component when value is non-empty)
    'data-[filled]:bg-muted/40',
    // Active state: editable fields match :focus-visible on any focus (mouse too)
    'focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring',
  ].join(' '),
  {
    variants,
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
