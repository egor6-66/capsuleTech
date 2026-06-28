import { createStyle } from '@capsuletech/web-style';
import { mergeProps, splitProps } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import type { ISpinnerProps } from './interfaces';
import { spinnerCva } from './variants';

/**
 * Spinner — крутящийся индикатор загрузки.
 *
 * @example
 * ```tsx
 * <Spinner />
 * <Spinner size="sm" />
 * <Spinner size="lg" class="text-primary" />
 * ```
 */
export const Spinner = (props: ISpinnerProps) => {
  useTrace('web-ui.spinner'); // ADR 062
  const merged = mergeProps({ label: 'Loading' }, props);
  const [local, variants] = splitProps(merged, ['class', 'style', 'label']);

  const styleProps = mergeProps(variants, {
    get class() {
      return local.class;
    },
    get style() {
      return local.style;
    },
  });
  const { className, style } = createStyle(spinnerCva, styleProps);

  return (
    <span role="status" aria-label={local.label} style={style()}>
      <span class={className()} aria-hidden="true" />
    </span>
  );
};
