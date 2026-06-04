import { createStyle } from '@capsuletech/web-style';
import { splitProps } from 'solid-js';

import type { ITextareaProps } from './interfaces';
import { textareaCva } from './variants';

/**
 * Textarea — multiline text input.
 *
 * Mirrors `Input` in styling conventions (CVA + themed tokens) but renders
 * a `<textarea>` element. Supports controlled and uncontrolled usage via
 * native `value` / `onInput` attributes.
 *
 * @example
 * ```tsx
 * <Textarea placeholder="Enter description…" rows={4} />
 * <Textarea size="lg" resize="none" value={text()} onInput={(e) => setText(e.target.value)} />
 * ```
 */
export const Textarea = (props: ITextareaProps) => {
  const [local, variants, others] = splitProps(
    props,
    ['class', 'style', 'resize'],
    ['size', 'variant'],
  );

  const { className, style } = createStyle(textareaCva, {
    ...variants,
    class: local.class,
    style: local.style,
  });

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

  return <textarea class={className()} style={resizeStyle()} {...others} />;
};
