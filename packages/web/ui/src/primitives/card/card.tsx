import { createStyle } from '@capsuletech/web-style';
import { createMemo, splitProps } from 'solid-js';

import { createFinish } from '../../lib/finish';

import type { ICardProps } from './interfaces';
import { cardCva } from './variants';

export const Card = (props: ICardProps) => {
  const [local, variants, others] = splitProps(props, ['class', 'style'], ['variant', 'size']);

  const { className, style } = createStyle(cardCva, {
    ...variants,
    class: local.class,
    style: local.style,
  });

  // Finish hook — activated via global useFinishMode() signal from web-style.
  // No ref or DOM walk required — signal is the single source of truth.
  //
  // Style composition at the root div:
  //   OFF: surfaceStyle() → {}   → Tailwind bg-card class takes over.
  //   ON:  surfaceStyle() → { background: linear-gradient(…), box-shadow: … }
  //        Inline background overrides bg-card; inline box-shadow overrides the
  //        class-level `shadow` (no double-shadow artefact).
  const finish = createFinish();

  // Merged style memo — ensures Solid tracks both sources reactively.
  const mergedStyle = createMemo(() => ({ ...style(), ...finish.surfaceStyle() }));

  return (
    <div
      class={className()}
      style={mergedStyle()}
      {...(others as object)}
    />
  );
};
