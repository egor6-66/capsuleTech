import { cva } from '@capsuletech/web-style';

import { INPUT_FIELD_BASE } from './base';

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
