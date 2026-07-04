import type { VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';
import type { cardCva } from './variants';

export type CardVariants = VariantProps<typeof cardCva>;

export interface ICardProps extends JSX.HTMLAttributes<HTMLDivElement>, CardVariants {
  /**
   * Shadow elevation. Maps to Tailwind `shadow-{level}`.
   * Default (`'sm'`) preserves the current card shadow.
   */
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Width. Spacing-scale number — `w={24}` → `width: calc(var(--spacing) * 24)`.
   * Parity with Flex sizing props.
   */
  w?: number;
  /**
   * Min-width. Spacing-scale number.
   */
  minW?: number;
  /**
   * Max-width. Spacing-scale number.
   */
  maxW?: number;
  /**
   * Visual affordance for clickable cards — `cursor-pointer` + hover surface
   * (`hover:bg-accent hover:text-accent-foreground`). Purely presentational;
   * click handling stays the consumer's responsibility (meta/onClick).
   */
  interactive?: boolean;
  /**
   * Persistent "selected" surface (`bg-accent text-accent-foreground`) +
   * `data-selected` reflection. Card is a bare `<div>` with no ARIA role, so
   * `aria-selected` would be invalid without one (a11y lint) — pass your own
   * `role`/`aria-selected` explicitly when this Card acts as a listbox option
   * or tab (the passthrough spread still applies it).
   */
  selected?: boolean;
  /**
   * Root padding token. `'none'` (default, current behaviour — chrome only,
   * no padding) / `'sm'` (`p-card-tight`, compact — tiles/chips) / `'md'`
   * (`p-card`, matches `Card.Content` default).
   */
  padding?: 'none' | 'sm' | 'md';
}

// ---- Card.Header props ----
export interface ICardHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** When true: adds `border-b border-border` separator below the header. */
  divider?: boolean;
}

// ---- Card.Title / Card.Description alignment ----
export type CardTextAlign = 'start' | 'center' | 'end';

export interface ICardTitleProps extends JSX.HTMLAttributes<HTMLDivElement> {
  align?: CardTextAlign;
}

export interface ICardDescriptionProps extends JSX.HTMLAttributes<HTMLDivElement> {
  align?: CardTextAlign;
}

// ---- Card.Content props ----
export interface ICardContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * Gap override (spacing-scale). Default `gap-cell` token applied via class.
   * Pass `0` to remove gap.
   */
  gap?: number;
  /**
   * Padding override (spacing-scale). Default `p-card` token applied via class.
   * Pass `0` to remove padding.
   */
  padding?: number;
}
