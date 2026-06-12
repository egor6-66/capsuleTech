import { cn } from '@capsuletech/web-style';
import { type JSX, splitProps } from 'solid-js';
import type {
  ICardContentProps,
  ICardDescriptionProps,
  ICardHeaderProps,
  ICardTitleProps,
  CardTextAlign,
} from './interfaces';

// Static align table — Tailwind purge sees all classes.
const ALIGN: Record<CardTextAlign, string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
};

const toSpacing = (n: number) => `calc(var(--spacing) * ${n})`;

export const CardHeader = (props: ICardHeaderProps) => {
  const [local, others] = splitProps(props, ['class', 'divider']);
  return (
    <div
      class={cn(
        'flex flex-col space-y-1.5 px-card py-card-tight',
        local.divider && 'border-b border-border',
        local.class,
      )}
      {...others}
    />
  );
};

export const CardTitle = (props: ICardTitleProps) => {
  const [local, others] = splitProps(props, ['class', 'align']);
  return (
    <div
      class={cn(
        'font-semibold leading-tight tracking-tight text-lg',
        local.align && ALIGN[local.align],
        local.class,
      )}
      {...others}
    />
  );
};

export const CardDescription = (props: ICardDescriptionProps) => {
  const [local, others] = splitProps(props, ['class', 'align']);
  return (
    <div
      class={cn(
        'text-sm leading-normal text-muted-foreground',
        local.align && ALIGN[local.align],
        local.class,
      )}
      {...others}
    />
  );
};

export const CardContent = (props: ICardContentProps) => {
  const [local, others] = splitProps(props, ['class', 'style', 'gap', 'padding']);

  // Default: flex flex-col gap-cell p-card  (symmetric padding, all sides)
  // Override via gap/padding props (spacing-scale) or class= if needed.
  const sizingStyle = () => {
    const s: Record<string, string> = {};
    if (local.gap !== undefined) s.gap = toSpacing(local.gap);
    if (local.padding !== undefined) {
      s.padding = toSpacing(local.padding);
    }
    // Merge with consumer-provided style
    if (typeof local.style === 'object' && local.style !== null) {
      return { ...s, ...(local.style as Record<string, string>) };
    }
    return s;
  };

  return (
    <div
      class={cn(
        // Default layout: vertical stack with card spacing
        // gap-cell and p-card are token-based; overridable via gap/padding props
        local.gap === undefined && local.padding === undefined
          ? 'flex flex-col gap-cell p-card'
          : 'flex flex-col p-card',
        local.class,
      )}
      style={sizingStyle()}
      {...others}
    />
  );
};

export const CardFooter = (props: JSX.HTMLAttributes<HTMLDivElement>) => {
  const [local, others] = splitProps(props, ['class']);
  return (
    <div class={cn('flex items-center px-card pb-card', local.class)} {...others} />
  );
};
