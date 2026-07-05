import { cn, createStyle } from '@capsuletech/web-style';
import { createMemo, type JSX, mergeProps, splitProps } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import { createFinish } from '../../lib/finish';
import { CardEntityContent } from './entity';
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
  useTrace('web-ui.card'); // ADR 062
  const [local, variants, sizing, entity, interaction, others] = splitProps(
    props,
    ['class', 'style'],
    ['variant', 'size', 'interactive', 'selected', 'padding'],
    ['elevation', 'w', 'minW', 'maxW'],
    [
      'title',
      'titleAction',
      'subtitle',
      'translation',
      'definition',
      'badge',
      'tags',
      'meta',
      'align',
    ],
    ['onClick', 'onKeyDown', 'role', 'tabIndex', 'children'],
  );

  // Entity mode: any content slot set → Card draws the data-driven stack itself
  // (compound `Card.Header/…` children path is untouched when no slot is set).
  const isEntity = () =>
    entity.title !== undefined ||
    entity.titleAction !== undefined ||
    entity.subtitle !== undefined ||
    entity.translation !== undefined ||
    entity.definition !== undefined ||
    entity.badge !== undefined ||
    entity.tags !== undefined ||
    entity.meta !== undefined;

  // Entity mode needs inner padding (no Card.Content to supply it); default to
  // `md` (p-card) unless the consumer set `padding` explicitly. Compound mode
  // keeps the current default (no root padding — parts pad themselves).
  const effectivePadding = () =>
    isEntity() && variants.padding === undefined ? 'md' : variants.padding;

  // a11y: an interactive Card with an onClick becomes a real button — role +
  // tabIndex + Enter/Space activation baked in, so the consumer stops wiring
  // `role="button" tabIndex={0}` by hand. An explicit `role`/`tabIndex` wins.
  const isButton = () => !!variants.interactive && interaction.onClick !== undefined;
  const role = () => interaction.role ?? (isButton() ? 'button' : undefined);
  const tabIndex = () => interaction.tabIndex ?? (isButton() ? 0 : undefined);
  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (e) => {
    if (typeof interaction.onKeyDown === 'function') interaction.onKeyDown(e);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).click();
    }
  };

  // elevation prop overrides the default `shadow` in cardCva base.
  // We pass it as an extra class so twMerge resolves the conflict correctly.
  const elevationClass = () =>
    sizing.elevation !== undefined ? ELEVATION[sizing.elevation] : undefined;

  const styleProps = mergeProps(variants, {
    get padding() {
      return effectivePadding();
    },
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

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: role/tabIndex/onKeyDown are applied together with onClick under the isButton() gate (interactive + onClick) — biome can't see the runtime relationship; a bare-onClick Card (consumer-supplied role, e.g. a listbox option) is also valid.
    <div
      class={className()}
      style={mergedStyle()}
      data-selected={variants.selected ? 'true' : undefined}
      role={role()}
      tabIndex={tabIndex()}
      onClick={interaction.onClick}
      onKeyDown={isButton() ? handleKeyDown : interaction.onKeyDown}
      {...(others as object)}
    >
      {isEntity() ? <CardEntityContent {...entity} /> : interaction.children}
    </div>
  );
};

export const Card = Object.assign(CardImpl, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
});
