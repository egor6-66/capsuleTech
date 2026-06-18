import { cn, createStyle } from '@capsuletech/web-style';
import { createMemo, mergeProps, splitProps } from 'solid-js';

import { createFinish } from '../../lib/finish';
import type { ICardProps } from './interfaces';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './parts';
import { cardCva } from './variants';

// Static elevation table — Tailwind purge sees all shadow-* classes.
const ELEVATION: Record<NonNullable<ICardProps['elevation']>, string> = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
};

const toSpacing = (n: number) => `calc(var(--spacing) * ${n})`;

const CardImpl = (props: ICardProps) => {
  const [local, variants, sizing, others] = splitProps(
    props,
    ['class', 'style'],
    ['variant', 'size'],
    ['elevation', 'w', 'minW', 'maxW'],
  );

  // elevation prop overrides the default `shadow` in cardCva base.
  // We pass it as an extra class so twMerge resolves the conflict correctly.
  const elevationClass = () =>
    sizing.elevation !== undefined ? ELEVATION[sizing.elevation] : undefined;

  const styleProps = mergeProps(variants, {
    get class() {
      return cn(local.class, elevationClass());
    },
    get style() {
      return local.style;
    },
  });
  const { className, style } = createStyle(cardCva, styleProps);

  // Finish hook — activated via global useFinishMode() signal from web-style.
  const finish = createFinish();

  // Sizing inline styles
  const sizingStyle = () => {
    const s: Record<string, string> = {};
    if (sizing.w !== undefined) s.width = toSpacing(sizing.w);
    if (sizing.minW !== undefined) s['min-width'] = toSpacing(sizing.minW);
    if (sizing.maxW !== undefined) s['max-width'] = toSpacing(sizing.maxW);
    return s;
  };

  // Merged style memo — ensures Solid tracks all sources reactively.
  const mergedStyle = createMemo(() => ({
    ...style(),
    ...sizingStyle(),
    ...finish.surfaceStyle(),
  }));

  return <div class={className()} style={mergedStyle()} {...(others as object)} />;
};

export const Card = Object.assign(CardImpl, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
});
