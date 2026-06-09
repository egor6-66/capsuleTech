import { cva } from '@capsuletech/web-style';

export const variants = {
  variant: {
    // default: 'text-primary-foreground shadow hover:bg-primary/90',
  },
  size: {
    default: 'h-auto px-input py-input',
  },
};

export const inputCva = cva(
  [
    // Layout & sizing
    'flex w-full rounded-md border border-input text-sm shadow-sm',
    // Transition
    'transition-colors duration-200',
    // Background — 3-state fill (component-driven via data-filled attribute)
    // 1. empty  (no data-filled):   transparent — blends with parent bg
    // 2. filled (data-filled=""):   muted/40    — subtle tint signals content
    // 3. focus-visible:             bg-background — full bg "lifts" the control + ring
    //    focus order is after data-[filled] so focus always wins specificity.
    'bg-transparent',
    'data-[filled]:bg-muted/40',
    'focus-visible:bg-background',
    // Focus ring
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring',
    // File input reset
    'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
    // Placeholder
    'placeholder:text-muted-foreground',
    // Disabled
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants,
    defaultVariants: {
      // variant: 'default',
      size: 'default',
    },
  },
);
