/**
 * Shell.ThemePicker unit tests — лочат контракт wrapper'а над Shell.Picker
 * (IThemePickerProps НЕ ломаем, поведение 1:1 с historic-версией).
 *
 * Coverage:
 *   1. Дефолт — DISCOVERED_THEMES как опции.
 *   2. Выбор без onSelect → setTheme(name, target); onChange после.
 *   3. Инжект value/onSelect — глобальный setTheme НЕ вызывается.
 *   4. Standalone — дефолтный trigger "Theme: <current>".
 *   5. Sub — Row label 'Тема' + Palette-иконка.
 *   6. themes prop переопределяет список.
 */

/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemePicker } from '../themePicker';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const { emitSpy, setThemeSpy } = vi.hoisted(() => ({
  emitSpy: vi.fn(),
  setThemeSpy: vi.fn(),
}));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

vi.mock('@capsuletech/web-style', () => ({
  DISCOVERED_THEMES: ['default', 'dark'],
  setTheme: setThemeSpy,
  useTheme: () => () => 'default',
}));

vi.mock('@capsuletech/web-ui/icons', () => ({
  Palette: () => <svg data-testid="palette-icon" />,
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
        <Dynamic component={props.icon} />
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
  setThemeSpy.mockClear();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

const items = () => [...container.querySelectorAll('[data-testid="picker-item"]')];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Shell.ThemePicker — defaults', () => {
  it('renders DISCOVERED_THEMES as options', () => {
    cleanup = render(() => <ThemePicker />, container);

    expect(items()).toHaveLength(2);
    expect(items()[0].textContent).toContain('default');
    expect(items()[1].textContent).toContain('dark');
  });

  it('marks the current global theme with a checkmark', () => {
    cleanup = render(() => <ThemePicker />, container);

    expect(items()[0].textContent).toContain('✓');
    expect(items()[1].textContent).not.toContain('✓');
  });

  it('standalone trigger shows "Theme: <current>"', () => {
    cleanup = render(() => <ThemePicker />, container);

    const trigger = container.querySelector('[data-testid="picker-trigger"]');
    expect(trigger?.textContent).toContain('Theme:');
    expect(trigger?.textContent).toContain('default');
  });
});

describe('Shell.ThemePicker — global select path', () => {
  it('calls setTheme(name, target) and onChange after it', () => {
    const order: string[] = [];
    setThemeSpy.mockImplementation(() => order.push('setTheme'));
    const onChange = vi.fn(() => order.push('onChange'));
    const target = document.createElement('div');

    cleanup = render(() => <ThemePicker target={target} onChange={onChange} />, container);
    (items()[1] as HTMLElement).click();

    expect(setThemeSpy).toHaveBeenCalledWith('dark', target);
    expect(onChange).toHaveBeenCalledWith('dark');
    expect(order).toEqual(['setTheme', 'onChange']);
  });

  it('emits onPick with name "theme" (ADR 032 role-event)', () => {
    cleanup = render(() => <ThemePicker />, container);
    (items()[1] as HTMLElement).click();

    expect(emitSpy).toHaveBeenCalledWith('onPick', {
      source: 'Shell.Picker',
      payload: { name: 'theme', value: 'dark' },
    });
  });
});

describe('Shell.ThemePicker — state-injectable path', () => {
  it('uses value/onSelect and bypasses global setTheme', () => {
    const onSelect = vi.fn();

    cleanup = render(() => <ThemePicker value={() => 'dark'} onSelect={onSelect} />, container);

    // checkmark reads from injected value(), not global useTheme()
    expect(items()[1].textContent).toContain('✓');

    (items()[0] as HTMLElement).click();
    expect(onSelect).toHaveBeenCalledWith('default');
    expect(setThemeSpy).not.toHaveBeenCalled();
  });

  it('themes prop overrides the discovered list', () => {
    cleanup = render(() => <ThemePicker themes={['solar', 'lunar', 'astro']} />, container);

    expect(items()).toHaveLength(3);
    expect(items()[0].textContent).toContain('solar');
  });
});

describe('Shell.ThemePicker — sub mode', () => {
  it('renders sub row with default label "Тема" and Palette icon', () => {
    cleanup = render(() => <ThemePicker mode="sub" />, container);

    const row = container.querySelector('[data-testid="dropdown-row"]');
    expect(row?.getAttribute('data-variant')).toBe('sub');
    expect(container.querySelector('[data-testid="row-label"]')?.textContent).toBe('Тема');
    expect(container.querySelector('[data-testid="palette-icon"]')).not.toBeNull();
  });

  it('custom triggerLabel overrides the default', () => {
    cleanup = render(() => <ThemePicker mode="sub" triggerLabel="Theme" />, container);

    expect(container.querySelector('[data-testid="row-label"]')?.textContent).toBe('Theme');
  });
});
