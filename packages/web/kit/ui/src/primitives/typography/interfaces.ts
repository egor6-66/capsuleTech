import type { VariantProps } from 'class-variance-authority';
import type { Component, JSX } from 'solid-js';
import type { typographyCva } from './variants';

export type TypographyVariants = VariantProps<typeof typographyCva>;

export interface ITypographyProps extends JSX.HTMLAttributes<HTMLElement>, TypographyVariants {
  // В Solid используем string или Component для динамических тегов
  as?: string | Component<any>;
  /**
   * Text alignment override. Maps to Tailwind `text-left|text-center|text-right`.
   * Does not conflict with existing `variant` styles.
   */
  align?: 'start' | 'center' | 'end';
  /**
   * Tone (color) override. Replaces `color` CVA variant with a dedicated prop.
   * `'default'` = `text-foreground` (same as current color='default').
   * Prefer `tone` over raw `class="text-*"` to keep theme-switching intact.
   */
  tone?: 'default' | 'muted' | 'destructive' | 'primary';
  /**
   * Font-size override — applied on top of the variant's size.
   * Useful when you want h2 font-weight/tracking but a custom size.
   * Maps to Tailwind `text-{size}`.
   */
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  /**
   * When `true`: opacity-0; when `false` (default): opacity-100.
   * Always adds `transition-opacity duration-200` for smooth fade-in/out.
   * Keeps element in DOM (preserves layout height), only hides visually.
   */
  dim?: boolean;
}
