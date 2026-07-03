/**
 * Shell.Picker unit tests.
 *
 * Coverage (per brief shell-generic-picker):
 *   1. Рендер опций — string shorthand и {value,label}.
 *   2. Галочка на текущем value().
 *   3. Порядок при выборе: onSelect → emit('onPick') → onChange.
 *   4. emit onPick — payload { name, value }, дефолтный и кастомный name.
 *   5. mode='sub' — Dropdown.Sub + Row(variant='sub') + SubContent.
 *   6. Standalone trigger — дефолтный label = current(), override через triggerLabel.
 */

/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Picker } from '../picker';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

vi.mock('@capsuletech/web-ui/dropdown', () => {
  const { Dynamic } = require('solid-js/web');
  const { Show } = require('solid-js');

  const Trigger = (props: any) => (
    <button type="button" data-testid="picker-trigger" class={props.class}>
      {props.children}
    </button>
  );
  const Content = (props: any) => <div data-testid="picker-content">{props.children}</div>;
  const Item = (props: any) => (
    <button type="button" data-testid="picker-item" onClick={() => props.onSelect?.()}>
      {props.children}
    </button>
  );
  const Sub = (props: any) => <div data-testid="dropdown-sub">{props.children}</div>;
  const SubContent = (props: any) => <div data-testid="dropdown-sub-content">{props.children}</div>;
  const Row = (props: any) => (
    <div data-testid="dropdown-row" data-variant={props.variant} class={props.class}>
      <Show when={props.icon}>
        <Dynamic component={props.icon} data-testid="row-icon" />
      </Show>
      <span data-testid="row-label">{props.label}</span>
    </div>
  );

  const DropdownImpl = (props: any) => <div data-testid="dropdown-root">{props.children}</div>;

  const Dropdown = Object.assign(DropdownImpl, { Trigger, Content, Item, Sub, SubContent, Row });

  return { Dropdown };
});

vi.mock('@capsuletech/web-ui/button', () => ({
  Button: (props: any) => (
    <button type="button" class={props.class}>
      {props.children}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Test scaffolding
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  emitSpy.mockClear();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

const items = () => [...container.querySelectorAll('[data-testid="picker-item"]')];
const clickItem = (index: number) => (items()[index] as HTMLElement).click();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Shell.Picker — options rendering', () => {
  it('renders string shorthand options', () => {
    cleanup = render(() => <Picker options={['alpha', 'beta']} />, container);

    expect(items()).toHaveLength(2);
    expect(items()[0].textContent).toContain('alpha');
    expect(items()[1].textContent).toContain('beta');
  });

  it('renders {value,label} options with label, falls back to value', () => {
    cleanup = render(
      () => <Picker options={[{ value: 'ru', label: 'Русский' }, { value: 'en' }]} />,
      container,
    );

    expect(items()[0].textContent).toContain('Русский');
    expect(items()[0].textContent).not.toContain('ru');
    expect(items()[1].textContent).toContain('en');
  });
});

describe('Shell.Picker — current value checkmark', () => {
  it('marks the option matching value()', () => {
    cleanup = render(() => <Picker options={['alpha', 'beta']} value={() => 'beta'} />, container);

    expect(items()[0].textContent).not.toContain('✓');
    expect(items()[1].textContent).toContain('✓');
  });

  it('marks nothing when value() is undefined', () => {
    cleanup = render(() => <Picker options={['alpha', 'beta']} />, container);

    expect(container.textContent).not.toContain('✓');
  });
});

describe('Shell.Picker — select flow', () => {
  it('calls onSelect → emit → onChange in order', () => {
    const order: string[] = [];
    const onSelect = vi.fn(() => order.push('onSelect'));
    const onChange = vi.fn(() => order.push('onChange'));
    emitSpy.mockImplementation(() => order.push('emit'));

    cleanup = render(
      () => <Picker options={['alpha']} onSelect={onSelect} onChange={onChange} />,
      container,
    );
    clickItem(0);

    expect(order).toEqual(['onSelect', 'emit', 'onChange']);
    expect(onSelect).toHaveBeenCalledWith('alpha');
    expect(onChange).toHaveBeenCalledWith('alpha');
  });

  it('emits onPick with { name, value } payload (default name "picker")', () => {
    cleanup = render(() => <Picker options={['alpha']} />, container);
    clickItem(0);

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith('onPick', {
      source: 'Shell.Picker',
      payload: { name: 'picker', value: 'alpha' },
    });
  });

  it('emits onPick with the custom name prop', () => {
    cleanup = render(() => <Picker name="engine" options={['gtts', 'silero']} />, container);
    clickItem(1);

    expect(emitSpy).toHaveBeenCalledWith('onPick', {
      source: 'Shell.Picker',
      payload: { name: 'engine', value: 'silero' },
    });
  });

  it('emits even without onSelect/onChange (event = role, inject = option)', () => {
    cleanup = render(() => <Picker options={['alpha']} />, container);
    clickItem(0);

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Shell.Picker — standalone mode (default)', () => {
  it('renders own Dropdown root with trigger and caret', () => {
    cleanup = render(() => <Picker options={['alpha']} value={() => 'alpha'} />, container);

    expect(container.querySelector('[data-testid="dropdown-root"]')).not.toBeNull();
    const trigger = container.querySelector('[data-testid="picker-trigger"]');
    expect(trigger?.textContent).toContain('alpha');
    expect(trigger?.textContent).toContain('▾');
  });

  it('renders custom triggerLabel instead of current value', () => {
    cleanup = render(
      () => <Picker options={['alpha']} value={() => 'alpha'} triggerLabel="Выбор" />,
      container,
    );

    const trigger = container.querySelector('[data-testid="picker-trigger"]');
    expect(trigger?.textContent).toContain('Выбор');
  });
});

describe('Shell.Picker — sub mode', () => {
  it('renders Dropdown.Sub with variant="sub" row and SubContent items', () => {
    cleanup = render(() => <Picker mode="sub" options={['alpha', 'beta']} />, container);

    expect(container.querySelector('[data-testid="dropdown-root"]')).toBeNull();
    expect(container.querySelector('[data-testid="dropdown-sub"]')).not.toBeNull();

    const row = container.querySelector('[data-testid="dropdown-row"]');
    expect(row?.getAttribute('data-variant')).toBe('sub');

    const subContent = container.querySelector('[data-testid="dropdown-sub-content"]');
    expect(subContent?.querySelectorAll('[data-testid="picker-item"]')).toHaveLength(2);
  });

  it('passes icon and triggerLabel to the row', () => {
    const Icon = () => <svg data-testid="custom-icon" />;
    cleanup = render(
      () => <Picker mode="sub" options={['alpha']} icon={Icon} triggerLabel="Движок" />,
      container,
    );

    expect(container.querySelector('[data-testid="custom-icon"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="row-label"]')?.textContent).toBe('Движок');
  });
});
