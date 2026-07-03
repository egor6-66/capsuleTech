import { createStyle } from '@capsuletech/web-style';
import { Separator as SeparatorPrimitive } from '@kobalte/core/separator';
import { mergeProps, splitProps } from 'solid-js';
import { useTrace } from '../../internal/useTrace';
import type { ISeparatorProps } from './interfaces';
import { separatorCva } from './variants';

export const Separator = (props: ISeparatorProps) => {
  useTrace('web-ui.separator'); // ADR 062
  // Устанавливаем дефолты через mergeProps, чтобы сохранить реактивность
  const merged = mergeProps({ orientation: 'horizontal', decorative: true }, props);

  const [local, others] = splitProps(merged, [
    'class',
    'style',
    'orientation',
    'decorative',
    'variant',
  ]);

  // Вычисляем вариант: если явно не задан, берем из orientation
  const activeVariant = () => local.variant || local.orientation;

  const { className, style } = createStyle(separatorCva, {
    get variant() {
      return activeVariant();
    },
    get class() {
      return local.class;
    },
    get style() {
      return local.style;
    },
  });

  // Kobalte 0.13.11 SeparatorPrimitive has no `decorative` option — the prop
  // is intentionally NOT forwarded (would leak as a raw invalid DOM attribute).
  // Radix/shadcn semantics implemented here: decorative=true (default) removes
  // the element from the a11y tree via explicit role="none" (overrides the
  // <hr>'s implicit separator role); decorative=false keeps implicit semantics.
  return (
    <SeparatorPrimitive
      orientation={(local.orientation as 'horizontal' | 'vertical') || 'horizontal'}
      role={local.decorative ? 'none' : undefined}
      class={className()}
      style={style()}
      {...others}
    />
  );
};
