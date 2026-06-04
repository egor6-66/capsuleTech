/**
 * Textarea primitive tests.
 *
 * Uses jsdom (via vitest `/* @vitest-environment jsdom * /`) to render the
 * Solid component and verify DOM output.
 *
 * Covered:
 *   - Renders a <textarea> element.
 *   - Passes through standard HTML attributes (placeholder, rows, disabled).
 *   - Forwards value prop.
 *   - CVA size variant adds expected class tokens.
 *   - resize prop is reflected in the inline style.
 *   - Custom class is merged with CVA classes.
 *   - onInput handler fires on input events.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Textarea } from '../textarea';

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.innerHTML = '';
});

describe('Textarea', () => {
  it('renders a <textarea> element', () => {
    cleanup = render(() => <Textarea />, container);
    expect(container.querySelector('textarea')).not.toBeNull();
  });

  it('forwards placeholder prop', () => {
    cleanup = render(() => <Textarea placeholder="Enter text…" />, container);
    const el = container.querySelector('textarea')!;
    expect(el.getAttribute('placeholder')).toBe('Enter text…');
  });

  it('forwards rows prop', () => {
    cleanup = render(() => <Textarea rows={6} />, container);
    const el = container.querySelector('textarea')!;
    expect(el.getAttribute('rows')).toBe('6');
  });

  it('forwards disabled prop', () => {
    cleanup = render(() => <Textarea disabled />, container);
    const el = container.querySelector('textarea')!;
    expect(el.disabled).toBe(true);
  });

  it('forwards value prop', () => {
    cleanup = render(() => <Textarea value="preset content" />, container);
    const el = container.querySelector('textarea')!;
    expect(el.value).toBe('preset content');
  });

  it('merges custom class with CVA base classes', () => {
    cleanup = render(() => <Textarea class="my-custom" />, container);
    const el = container.querySelector('textarea')!;
    expect(el.className).toContain('my-custom');
    // CVA base class token
    expect(el.className).toContain('rounded-md');
  });

  it('applies resize style when resize prop is set', () => {
    cleanup = render(() => <Textarea resize="none" />, container);
    const el = container.querySelector('textarea')!;
    expect(el.style.resize).toBe('none');
  });

  it('applies resize:vertical by default (no inline style when not set)', () => {
    cleanup = render(() => <Textarea />, container);
    const el = container.querySelector('textarea')!;
    // No resize prop — inline style should not constrain resize
    expect(el.style.resize).toBe('');
  });

  it('fires onInput callback when user types', () => {
    const onInput = vi.fn();
    cleanup = render(() => <Textarea onInput={onInput} />, container);
    const el = container.querySelector('textarea')!;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onInput).toHaveBeenCalledOnce();
  });

  it('CVA size="sm" adds text-xs class', () => {
    cleanup = render(() => <Textarea size="sm" />, container);
    const el = container.querySelector('textarea')!;
    expect(el.className).toContain('text-xs');
  });

  it('CVA size="lg" adds text-base class', () => {
    cleanup = render(() => <Textarea size="lg" />, container);
    const el = container.querySelector('textarea')!;
    expect(el.className).toContain('text-base');
  });
});
