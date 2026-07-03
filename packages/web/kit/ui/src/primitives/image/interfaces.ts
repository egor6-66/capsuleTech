import type { VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';
import type { imageCva } from './variants';

type CvaProps = VariantProps<typeof imageCva>;

export interface IImageProps extends JSX.ImgHTMLAttributes<HTMLImageElement>, CvaProps {
  /**
   * Image source URL.
   */
  src: string;

  /**
   * Alt text for accessibility.
   */
  alt: string;

  /**
   * Content to display while the image is loading or if it fails to load.
   * Typically an icon, initials, or custom fallback UI.
   */
  fallback?: JSX.Element;

  /**
   * CSS class to apply to the root wrapper.
   */
  class?: string;

  /**
   * CSS properties to apply to the root wrapper.
   */
  style?: JSX.CSSProperties | string;
}
