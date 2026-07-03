import { cva } from '@capsuletech/web-style';

/**
 * CVA for Image wrapper.
 * Handles shape (square/circle) and size variants using density-aware tokens.
 */
export const imageCva = cva(
  'relative inline-flex items-center justify-center shrink-0 bg-muted overflow-hidden',
  {
    variants: {
      shape: {
        square: 'rounded-md',
        circle: 'rounded-full',
      },
      size: {
        xs: 'h-6 w-6',
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
      },
    },
    defaultVariants: {
      shape: 'square',
      size: 'md',
    },
  },
);
