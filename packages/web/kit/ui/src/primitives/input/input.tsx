import { createStyle } from '@capsuletech/web-style';
import { createMemo, createSignal, type JSX, mergeProps, splitProps } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import type { IInputProps } from './interfaces';
import { inputCva } from './variants';

export const Input = (props: IInputProps) => {
  useTrace('web-ui.input'); // ADR 062
  const [local, variants, others] = splitProps(
    props,
    ['class', 'style', 'type', 'value', 'defaultValue', 'onInput'],
    ['size', 'variant'],
  );

  const styleProps = mergeProps(variants, {
    get class() {
      return local.class;
    },
    get style() {
      return local.style;
    },
  });
  const { className, style } = createStyle(inputCva, styleProps);

  // Track whether the field has a non-empty value so we can set data-filled.
  // Controlled path: derive from props.value reactively.
  // Uncontrolled path: track via an internal signal updated in onInput.
  const [uncontrolledFilled, setUncontrolledFilled] = createSignal(
    Boolean(local.defaultValue !== undefined && local.defaultValue !== ''),
  );

  const isFilled = createMemo(() => {
    // Controlled: props.value drives the state
    if (local.value !== undefined) {
      return local.value !== '' && local.value !== null;
    }
    // Uncontrolled: signal tracks onInput
    return uncontrolledFilled();
  });

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    setUncontrolledFilled(e.currentTarget.value !== '');
    if (typeof local.onInput === 'function') {
      (local.onInput as JSX.EventHandler<HTMLInputElement, InputEvent>)(e);
    }
  };

  return (
    <input
      type={local.type || 'text'}
      class={className()}
      style={style()}
      value={local.value}
      {...(others as any)}
      data-filled={isFilled() ? '' : undefined}
      onInput={handleInput}
    />
  );
};
