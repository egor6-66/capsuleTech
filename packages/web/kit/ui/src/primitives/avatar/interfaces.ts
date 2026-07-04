import type { VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';
import type { imageCva } from '../image/variants';

/**
 * Avatar reuses Image's own size scale — no separate CVA/size scale is defined here.
 */
type ImageSize = VariantProps<typeof imageCva>['size'];

export interface IAvatarProps extends Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, 'fallback'> {
  /**
   * Image source URL.
   */
  src: string;
  /**
   * Alt text for accessibility (required).
   */
  alt: string;
  /**
   * Size — reuses Image's size scale (xs/sm/md/lg/xl). Defaults to 'md'.
   */
  size?: ImageSize;
  /**
   * Fallback content shown when image is loading or fails to load.
   * Can be a string (e.g., initials "AB") or JSX.Element.
   * String fallback is automatically wrapped in Typography for centering.
   */
  fallback?: string | JSX.Element;
  /**
   * Additional CSS classes applied to the root wrapper.
   */
  class?: string;
  /**
   * Inline styles applied to the root wrapper.
   */
  style?: JSX.CSSProperties | string;
}
