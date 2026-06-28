import { createStyle } from '@capsuletech/web-style';
import { createMemo, createSignal, type JSX, mergeProps, splitProps } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import type { ITextareaProps } from './interfaces';
import { textareaCva } from './variants';

/**
 * Textarea — multiline text input.
 *
 * Mirrors `Input` in styling conventions (CVA + themed tokens) but renders
 * a `<textarea>` element. Supports controlled and uncontrolled usage via
 * native `value` / `onInput` attributes.
 *
 * Tracks filled state via `data-filled` attribute (set when value is non-empty)
 * to drive the 3-state background: transparent → muted/40 (filled) → bg-background (focus).
 *
 * @example
 * ```tsx
 * <Textarea placeholder="Enter description…" rows={4} />
 * <Textarea size="lg" resize="none" value={text()} onInput={(e) => setText(e.target.value)} />
 * ```
 */
export const Textarea = (props: ITextareaProps) => {
  useTrace('web-ui.textarea'); // ADR 062
  const [local, variants, others] = splitProps(
    props,
    ['class', 'style', 'resize', 'value', 'defaultValue', 'onInput'],
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
  const { className, style } = createStyle(textareaCva, styleProps);

  const resizeStyle = () => {
    const base = style();
    const resizeCss = local.resize ? { resize: local.resize } : {};
    if (!base) return resizeCss as typeof base;
    if (typeof base === 'string') {
      // style as string — append resize inline; rare case, keep correct typing
      return base as typeof base;
    }
    return { ...base, ...resizeCss } as typeof base;
  };

  // Track whether the field has a non-empty value so we can set data-filled.
  // Controlled path: derive from props.value reactively.
  // Uncontrolled path: track via an internal signal updated in onInput.
  const [uncontrolledFilled, setUncontrolledFilled] = createSignal(
    Boolean(local.defaultValue !== undefined && local.defaultValue !== ''),
  );

  const isFilled = createMemo(() => {
    if (local.value !== undefined) {
      return local.value !== '' && local.value !== null;
    }
    return uncontrolledFilled();
  });

  const handleInput: JSX.EventHandler<HTMLTextAreaElement, InputEvent> = (e) => {
    setUncontrolledFilled(e.currentTarget.value !== '');
    if (typeof local.onInput === 'function') {
      (local.onInput as JSX.EventHandler<HTMLTextAreaElement, InputEvent>)(e);
    }
  };

  return (
    <textarea
      class={className()}
      style={resizeStyle()}
      value={local.value}
      {...(others as any)}
      data-filled={isFilled() ? '' : undefined}
      onInput={handleInput}
    />
  );
};
