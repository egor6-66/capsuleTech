import { cva } from '@capsuletech/web-style';

/** Size of the chamfered corner cut in pixels. */
export const CHAMFER_SIZE = 22;

/**
 * Returns the clip-path polygon for a given grip corner.
 * The chamfer is applied to the grip corner so the drag handle sits in the cut.
 *
 * Coordinate system: (0 0) = top-left, (100% 100%) = bottom-right.
 * `c` = CHAMFER_SIZE expressed as `calc(... - c px)` or `c px`.
 */
export function getClipPath(
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
): string {
  const c = `${CHAMFER_SIZE}px`;
  switch (corner) {
    case 'top-left':
      // chamfer top-left
      return `polygon(${c} 0, 100% 0, 100% 100%, 0 100%, 0 ${c})`;
    case 'top-right':
      // chamfer top-right
      return `polygon(0 0, calc(100% - ${c}) 0, 100% ${c}, 100% 100%, 0 100%)`;
    case 'bottom-right':
      // chamfer bottom-right
      return `polygon(0 0, 100% 0, 100% calc(100% - ${c}), calc(100% - ${c}) 100%, 0 100%)`;
    case 'bottom-left':
      // chamfer bottom-left
      return `polygon(0 0, 100% 0, 100% 100%, ${c} 100%, 0 calc(100% - ${c}))`;
  }
}

/** Grip absolute position — sits IN the chamfered corner. */
export const gripCornerClasses = {
  'top-left': 'top-0.5 left-0.5',
  'top-right': 'top-0.5 right-0.5',
  'bottom-left': 'bottom-0.5 left-0.5',
  'bottom-right': 'bottom-0.5 right-0.5',
} as const;

/**
 * CVA is kept minimal — the accent rim and glow are handled via inline CSS
 * on the two clip-path layers (they cannot be expressed with plain Tailwind utilities).
 * CVA controls only transition + cursor on the wrapper shell.
 */
export const widgetFrameCva = cva('relative h-full w-full', {
  variants: {
    active: {
      true: '',
      false: '',
    },
  },
  defaultVariants: {
    active: false,
  },
});
