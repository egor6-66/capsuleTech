import { cva } from '@capsuletech/web-style';

export const variants = {
  variant: {
    horizontal: 'h-px w-full',
    vertical: 'h-full w-px',
  },
};

export const separatorCva = cva('shrink-0 bg-border', {
  variants,
  defaultVariants: {
    variant: 'horizontal',
  },
});
