import { cva } from '@capsuletech/web-style';

/**
 * CVA for the outer wrapper of multi-row variants (text/table/list)
 * and for the full-bleed single-block variants (card/map).
 */
export const skeletonWrapperCva = cva('w-full', {
  variants: {
    variant: {
      text: '',
      table: 'h-full',
      list: '',
      card: '',
      map: 'h-full',
    },
  },
  defaultVariants: {
    variant: 'text',
  },
});

/**
 * CVA for individual kobalte Skeleton.Root blocks (each shard/row).
 * animate-pulse-subtle is applied unconditionally — we always show the placeholder.
 * [data-animate] on the kobalte root activates structural semantics;
 * visual pulse comes from our Tailwind utility.
 */
export const skeletonBlockCva = cva('animate-pulse-subtle rounded-md bg-muted', {
  variants: {
    variant: {
      text: '',
      table: '',
      list: '',
      card: '',
      map: 'rounded-none',
    },
  },
  defaultVariants: {
    variant: 'text',
  },
});
