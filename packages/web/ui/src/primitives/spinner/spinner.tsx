import { createStyle } from '@capsuletech/web-style';
import { mergeProps, splitProps } from 'solid-js';

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
  const merged = mergeProps({ label: 'Loading' }, props);
  const [local, variants] = splitProps(merged, ['class', 'style', 'label']);

  const { className, style } = createStyle(spinnerCva, {
    ...variants,
    class: local.class,
    style: local.style,
  });

  return (
    <span role="status" aria-label={local.label} style={style()}>
      <span class={className()} aria-hidden="true" />
    </span>
  );
};
