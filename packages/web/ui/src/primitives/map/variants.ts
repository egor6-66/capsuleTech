import { cva } from '@capsuletech/web-style';

export const mapCva = cva(
  'relative grid place-items-center overflow-hidden rounded-md bg-muted/30 text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'h-32',
        md: 'h-64',
        lg: 'h-96',
        full: 'h-full w-full',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
