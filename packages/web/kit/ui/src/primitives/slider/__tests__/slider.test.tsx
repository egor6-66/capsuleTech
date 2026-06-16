/**
 * Slider primitive tests.
 *
 * Kobalte Slider renders its thumb with role="slider" and the track inline
 * in the document — no portal involved.
 *
 * Covered:
 *   - Track and thumb render in DOM.
 *   - role="slider" is present on the thumb element.
 *   - aria-valuemin / aria-valuemax reflect min/max props.
 *   - defaultValue sets aria-valuenow on the thumb.
 *   - disabled prop — thumb has data-disabled attribute.
 *   - onChange fires with a single number when value changes via keyboard.
 *   - label renders when `label` prop is provided.
 *   - No label rendered when `label` is undefined.
 *   - Controlled mode: value prop drives aria-valuenow.
 *   - ISliderProps interface: structural smoke (no TS error on valid props).
 */
/* @vitest-environment jsdom */
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Slider } from '../slider';

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

/** Returns the thumb element (role="slider"). */
const getThumb = () => container.querySelector('[role="slider"]') as HTMLElement | null;

/** Fires an ArrowRight keyboard event on the thumb to increment by one step. */
const pressArrowRight = (el: Element) => {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
  );
};

/** Fires an ArrowLeft keyboard event on the thumb to decrement by one step. */
const pressArrowLeft = (el: Element) => {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
  );
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('Slider rendering', () => {
  it('renders thumb with role="slider"', () => {
    cleanup = render(() => <Slider defaultValue={0.5} />, container);
    expect(getThumb()).not.toBeNull();
  });

  it('renders track element', () => {
    cleanup = render(() => <Slider defaultValue={0.5} />, container);
    // Kobalte sets data-orientation on the track / root
    expect(container.querySelector('[data-orientation="horizontal"]')).not.toBeNull();
  });

  it('renders label when label prop is provided', () => {
    cleanup = render(() => <Slider label="Alpha" defaultValue={0.5} />, container);
    expect(container.textContent).toContain('Alpha');
  });

  it('does NOT render label text when label is undefined', () => {
    cleanup = render(() => <Slider defaultValue={0.5} />, container);
    // No label element — only thumb/track markup
    expect(container.querySelector('[data-slot="label"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// aria attributes
// ---------------------------------------------------------------------------

describe('Slider aria attributes', () => {
  it('aria-valuemin reflects min prop (default 0)', () => {
    cleanup = render(() => <Slider defaultValue={0.5} />, container);
    expect(getThumb()?.getAttribute('aria-valuemin')).toBe('0');
  });

  it('aria-valuemax reflects max prop (default 1)', () => {
    cleanup = render(() => <Slider defaultValue={0.5} />, container);
    expect(getThumb()?.getAttribute('aria-valuemax')).toBe('1');
  });

  it('aria-valuemin reflects custom min', () => {
    cleanup = render(() => <Slider min={10} max={100} step={1} defaultValue={50} />, container);
    expect(getThumb()?.getAttribute('aria-valuemin')).toBe('10');
  });

  it('aria-valuemax reflects custom max', () => {
    cleanup = render(() => <Slider min={10} max={100} step={1} defaultValue={50} />, container);
    expect(getThumb()?.getAttribute('aria-valuemax')).toBe('100');
  });

  it('aria-valuenow reflects defaultValue', () => {
    cleanup = render(() => <Slider min={0} max={1} step={0.01} defaultValue={0.3} />, container);
    const now = Number(getThumb()?.getAttribute('aria-valuenow'));
    expect(now).toBeCloseTo(0.3, 5);
  });
});

// ---------------------------------------------------------------------------
// Controlled mode
// ---------------------------------------------------------------------------

describe('Slider controlled mode', () => {
  it('aria-valuenow reflects controlled value prop', () => {
    cleanup = render(() => <Slider value={0.75} onChange={() => {}} />, container);
    const now = Number(getThumb()?.getAttribute('aria-valuenow'));
    expect(now).toBeCloseTo(0.75, 5);
  });

  it('updates aria-valuenow reactively when signal changes', () => {
    const [val, setVal] = createSignal(0.2);
    cleanup = render(() => <Slider value={val()} onChange={setVal} />, container);

    expect(Number(getThumb()?.getAttribute('aria-valuenow'))).toBeCloseTo(0.2, 5);

    setVal(0.8);
    expect(Number(getThumb()?.getAttribute('aria-valuenow'))).toBeCloseTo(0.8, 5);
  });
});

// ---------------------------------------------------------------------------
// disabled
// ---------------------------------------------------------------------------

describe('Slider disabled', () => {
  it('data-disabled is set on root when disabled=true', () => {
    cleanup = render(() => <Slider disabled defaultValue={0.5} />, container);
    // Kobalte sets data-disabled on the root group element
    expect(container.querySelector('[data-disabled]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// onChange callback (keyboard interaction)
// ---------------------------------------------------------------------------

describe('Slider onChange', () => {
  it('onChange fires with a number when ArrowRight is pressed', () => {
    const onChange = vi.fn();
    cleanup = render(
      () => <Slider min={0} max={1} step={0.1} defaultValue={0.5} onChange={onChange} />,
      container,
    );

    const thumb = getThumb()!;
    pressArrowRight(thumb);

    expect(onChange).toHaveBeenCalled();
    const firstArg = onChange.mock.calls[0][0];
    expect(typeof firstArg).toBe('number');
    expect(firstArg).toBeCloseTo(0.6, 5);
  });

  it('onChange fires with a number when ArrowLeft is pressed', () => {
    const onChange = vi.fn();
    cleanup = render(
      () => <Slider min={0} max={1} step={0.1} defaultValue={0.5} onChange={onChange} />,
      container,
    );

    const thumb = getThumb()!;
    pressArrowLeft(thumb);

    expect(onChange).toHaveBeenCalled();
    const firstArg = onChange.mock.calls[0][0];
    expect(typeof firstArg).toBe('number');
    expect(firstArg).toBeCloseTo(0.4, 5);
  });

  it('onChange returns value within [min, max]', () => {
    const onChange = vi.fn();
    cleanup = render(
      () => <Slider min={0} max={1} step={0.1} defaultValue={0.9} onChange={onChange} />,
      container,
    );

    // Press right multiple times — should clamp at max=1
    const thumb = getThumb()!;
    pressArrowRight(thumb);
    pressArrowRight(thumb);
    pressArrowRight(thumb);

    const calls = onChange.mock.calls.map((c) => c[0] as number);
    expect(calls.every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ISliderProps structural smoke
// ---------------------------------------------------------------------------

describe('ISliderProps structural', () => {
  it('accepts all documented props without runtime error', () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    expect(() => {
      cleanup = render(
        () => (
          <Slider
            value={0.5}
            onChange={onChange}
            onChangeEnd={onChangeEnd}
            min={0}
            max={1}
            step={0.01}
            label="Test"
            showValue
            disabled={false}
            class="custom-class"
          />
        ),
        container,
      );
    }).not.toThrow();
  });
});
