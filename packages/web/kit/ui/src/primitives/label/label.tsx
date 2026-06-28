import { createStyle } from '@capsuletech/web-style';
import { splitProps } from 'solid-js';
import { useTrace } from '../../internal/useTrace';
import type { ILabelProps } from './interfaces';
import { labelCva } from './variants';

export const Label = (props: ILabelProps) => {
  useTrace('web-ui.label'); // ADR 062
  const [local, others] = splitProps(props, ['class', 'style']);

  const { className, style } = createStyle(labelCva, {
    class: local.class,
    style: local.style,
  });
  // biome-ignore lint/a11y/noLabelWithoutControl: standalone Label primitive — control association is delegated to the consumer via htmlFor / id in ...others.
  return <label class={className()} style={style()} {...others} />;
};
