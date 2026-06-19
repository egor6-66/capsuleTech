import { cva } from '@capsuletech/web-style';

/**
 * Inlined INPUT_FIELD_BASE — tokens live in `@capsuletech/web-style`;
 * this string is a local aggregation for CVA. Kept in sync with
 * primitives/select/variants.ts and primitives/textarea/variants.ts.
 *
 * ## Sizing
 *
 * The base carries `px-input` (horizontal padding only).
 * Height is controlled per-control:
 *   - Input        → `h-9` in inputCva (fixed, shadcn canon)
 *   - Select trigger → `h-9` in selectTriggerCva (fixed, shadcn canon)
 *   - Textarea     → `min-h-[80px] py-input` in textareaCva (multiline, no fixed height)
 *
 * ## 3-state background (empty → filled → active)
 *
 *   1. empty   — `bg-transparent`         blends with parent background
 *   2. filled  — `bg-muted/40`            subtle tint; driven by per-variant
 *                  data-attribute (differs between native inputs and Kobalte).
 *   3. active  — `bg-background`          "lifts" control + ring; driven by
 *                  `:focus-visible` (Input/Textarea) or `data-[expanded]` (Select).
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
    // default: 'text-primary-foreground shadow hover:bg-primary/90',
  },
  size: {
    // Fixed height (shadcn canon). sm/lg reserved for future use.
    default: 'h-9',
  },
};

export const inputCva = cva(
  [
    INPUT_FIELD_BASE,
    // Background state 2: filled (data-filled set by component when value is non-empty)
    'data-[filled]:bg-muted/40',
    // Active state: editable fields match :focus-visible on any focus (mouse too)
    'focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring',
    // File input reset
    'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
  ].join(' '),
  {
    variants,
    defaultVariants: {
      // variant: 'default',
      size: 'default',
    },
  },
);
