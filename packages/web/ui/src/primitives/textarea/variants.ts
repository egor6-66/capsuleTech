import { cva } from '@capsuletech/web-style';

export const variants = {
  variant: {
    default: '',
  },
  size: {
    sm: 'px-input py-1 text-xs',
    default: 'px-input py-input text-sm',
    lg: 'px-input py-3 text-base',
  },
} as const;

export const textareaCva = cva(
  [
    // Layout
    'flex min-h-[80px] w-full rounded-md border border-input text-foreground shadow-sm',
    // Transition
    'transition-colors duration-200',
    // Background — 3-state fill (component-driven via data-filled attribute; identical scheme to inputCva)
    // 1. empty  (no data-filled):   transparent — blends with parent bg
    // 2. filled (data-filled=""):   muted/40    — subtle tint signals content
    // 3. focus-visible:             bg-background — full bg "lifts" the control + ring
    //    focus order is after data-[filled] so focus always wins specificity.
    'bg-transparent',
    'data-[filled]:bg-muted/40',
    'focus-visible:bg-background',
    // Focus ring
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring',
    // Placeholder
    'placeholder:text-muted-foreground',
    // Disabled
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants,
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
