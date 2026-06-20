/* @vitest-environment jsdom */

/**
 * Toggle primitive smoke + reactivity + controlled/uncontrolled + a11y tests.
 *
 * Covers:
 *   - renders a <button role="switch">
 *   - aria-checked="false" by default
 *   - defaultChecked: true -> aria-checked="true" + data-checked attribute
 *   - click toggles state (uncontrolled): aria-checked flips, onChange called
 *   - disabled: click does NOT call onChange, native disabled attribute set
 *   - controlled: checked prop rules, click fires onChange but display unchanged
 *   - size="sm" -> h-4 w-7 on track; size="lg" -> h-6 w-11
 *   - label prop: <label> rendered with text + for = button id
 *   - reactivity: signal-derived class updates on root button
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toggle } from '../toggle';

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

// ---------------------------------------------------------------------------
// Smoke
// ---------------------------------------------------------------------------

describe('Toggle — smoke', () => {
  it('renders a button[role=switch]', () => {
    cleanup = render(() => <Toggle />, container);
    expect(container.querySelector('button[role="switch"]')).not.toBeNull();
  });

  it('aria-checked=false by default', () => {
    cleanup = render(() => <Toggle />, container);
    const btn = container.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(btn.getAttribute('aria-checked')).toBe('false');
  });

  it('defaultChecked=true -> aria-checked=true + data-checked present', () => {
    cleanup = render(() => <Toggle defaultChecked />, container);
    const btn = container.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(btn.getAttribute('aria-checked')).toBe('true');
    expect(btn.hasAttribute('data-checked')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Uncontrolled
// ---------------------------------------------------------------------------

describe('Toggle — uncontrolled', () => {
  it('click flips aria-checked and calls onChange with new value', () => {
    const onChange = vi.fn();
    cleanup = render(() => <Toggle onChange={onChange} />, container);
    const btn = container.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(btn.getAttribute('aria-checked')).toBe('false');
    btn.click();
    expect(btn.getAttribute('aria-checked')).toBe('true');
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(true);
    btn.click();
    expect(btn.getAttribute('aria-checked')).toBe('false');
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

// ---------------------------------------------------------------------------
// Disabled
// ---------------------------------------------------------------------------

describe('Toggle — disabled', () => {
  it('has native disabled attribute when disabled prop set', () => {
    cleanup = render(() => <Toggle disabled />, container);
    const btn = container.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('click does NOT call onChange when disabled', () => {
    const onChange = vi.fn();
    cleanup = render(() => <Toggle disabled onChange={onChange} />, container);
    const btn = container.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    btn.click();
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Controlled
// ---------------------------------------------------------------------------

describe('Toggle — controlled', () => {
  it('checked=false prop controls display; click fires onChange without updating aria-checked', () => {
    const onChange = vi.fn();
    cleanup = render(() => <Toggle checked={false} onChange={onChange} />, container);
    const btn = container.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(btn.getAttribute('aria-checked')).toBe('false');
    btn.click();
    expect(onChange).toHaveBeenCalledWith(true);
    // Without prop update, aria-checked stays false
    expect(btn.getAttribute('aria-checked')).toBe('false');
  });

  it('checked=true -> aria-checked=true', () => {
    cleanup = render(() => <Toggle checked={true} />, container);
    const btn = container.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(btn.getAttribute('aria-checked')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Size variants
// ---------------------------------------------------------------------------

describe('Toggle — size variants', () => {
  it('size=sm -> track has h-4 w-7 classes', () => {
    cleanup = render(() => <Toggle size="sm" />, container);
    const btn = container.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(btn.className).toContain('h-4');
    expect(btn.className).toContain('w-7');
  });

  it('size=lg -> track has h-6 w-11 classes', () => {
    cleanup = render(() => <Toggle size="lg" />, container);
    const btn = container.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(btn.className).toContain('h-6');
    expect(btn.className).toContain('w-11');
  });
});

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

describe('Toggle — label', () => {
  it('renders <label> with correct text when label prop provided', () => {
    cleanup = render(() => <Toggle label="Notifications" />, container);
    const label = container.querySelector('label');
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe('Notifications');
  });

  it('<label for> matches button id', () => {
    cleanup = render(() => <Toggle label="Test" />, container);
    const btn = container.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    const label = container.querySelector('label')!;
    expect(label.getAttribute('for')).toBe(btn.id);
  });

  it('no <label> rendered when label prop absent', () => {
    cleanup = render(() => <Toggle />, container);
    expect(container.querySelector('label')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Reactivity contract
// ---------------------------------------------------------------------------

describe('Toggle — reactivity', () => {
  it('signal-derived class updates on root button', () => {
    const [cls, setCls] = createSignal('');
    cleanup = render(() => <Toggle class={cls()} />, container);
    const btn = container.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(btn.className).not.toContain('my-toggle-dyn');
    setCls('my-toggle-dyn');
    expect(btn.className).toContain('my-toggle-dyn');
  });
});
