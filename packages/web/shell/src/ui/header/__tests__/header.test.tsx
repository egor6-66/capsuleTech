/**
 * Header block unit tests.
 *
 * Coverage:
 *   1. Nav renders one button per item with the correct label.
 *   2. Nav renders href on native anchor (no linkComponent).
 *   3. Menu trigger renders (Menu icon + aria-label).
 *   4. Default modes: all four mode-toggles present.
 *   5. Custom modes subset — only requested toggles rendered.
 *   6. theme=false suppresses ThemePicker.
 *   7. Custom items render with correct labels.
 *   8. Custom item onSelect fires when Dropdown.Item.onSelect is called.
 *   9. No custom items → no custom group rendered.
 *  10. brand slot renders its content.
 */

/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Header } from '../header';

// ---------------------------------------------------------------------------
// Stubs for connected sub-components so tests do not hit web-style/signals.
// ---------------------------------------------------------------------------

vi.mock('../../modeToggle', () => ({
  ModeToggle: (props: { mode: string }) => (
    <div data-testid={`mode-toggle-${props.mode}`}>{props.mode}</div>
  ),
}));

vi.mock('../../themePicker', () => ({
  ThemePicker: () => <div data-testid="theme-picker" />,
}));

// Stub Dropdown so it renders children without Kobalte portal/floating-ui.
vi.mock('@capsuletech/web-ui/dropdown', () => {
  const Trigger = (props: any) => (
    <button data-testid="menu-trigger" aria-label={props['aria-label']}>
      {props.children}
    </button>
  );
  const Content = (props: any) => <div data-testid="menu-content">{props.children}</div>;
  const Group = (props: any) => <div data-testid="dropdown-group">{props.children}</div>;
  const Label = (props: any) => <span data-testid="dropdown-label">{props.children}</span>;
  const Item = (props: any) => (
    <button
      data-testid="dropdown-item"
      onClick={() => props.onSelect?.()}
    >
      {props.children}
    </button>
  );
  const Separator = () => <hr data-testid="dropdown-separator" />;
  const Sub = (props: any) => <div>{props.children}</div>;
  const SubTrigger = (props: any) => <button>{props.children}</button>;
  const SubContent = (props: any) => <div>{props.children}</div>;

  const DropdownImpl = (props: any) => <div data-testid="dropdown-root">{props.children}</div>;

  const Dropdown = Object.assign(DropdownImpl, {
    Trigger,
    Content,
    Group,
    Label,
    Item,
    Separator,
    Sub,
    SubTrigger,
    SubContent,
  });

  return { Dropdown };
});

// Stub Button — always renders as <a> so tests can check href/label/children.
// The real Button is polymorphic; for tests we just need a stable DOM element.
vi.mock('@capsuletech/web-ui/button', () => ({
  Button: (props: any) => (
    <a
      data-testid="nav-button"
      href={props.href ?? props.to}
      aria-label={props['aria-label']}
      class={props.class}
    >
      {props.children}
    </a>
  ),
}));

// Stub Menu icon.
vi.mock('@capsuletech/web-ui/icons', () => ({
  Menu: (props: any) => <svg data-testid="menu-icon" aria-hidden={props['aria-hidden']} />,
}));

// ---------------------------------------------------------------------------
// Test scaffolding
// ---------------------------------------------------------------------------

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
// Tests
// ---------------------------------------------------------------------------

describe('Header — nav', () => {
  it('renders one button per nav item with correct label', () => {
    cleanup = render(
      () => (
        <Header
          nav={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Reports', to: '/reports' },
          ]}
        />
      ),
      container,
    );

    const buttons = container.querySelectorAll('[data-testid="nav-button"]');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe('Dashboard');
    expect(buttons[1].textContent).toBe('Reports');
  });

  it('renders href on native anchor when no linkComponent provided', () => {
    cleanup = render(
      () => <Header nav={[{ label: 'Home', to: '/home' }]} />,
      container,
    );

    const link = container.querySelector('[data-testid="nav-button"]');
    expect(link?.getAttribute('href')).toBe('/home');
  });

  it('renders no nav buttons when nav is not provided', () => {
    cleanup = render(() => <Header />, container);
    const buttons = container.querySelectorAll('[data-testid="nav-button"]');
    expect(buttons).toHaveLength(0);
  });
});

describe('Header — menu trigger', () => {
  it('renders menu trigger with aria-label', () => {
    cleanup = render(() => <Header />, container);
    const trigger = container.querySelector('[data-testid="menu-trigger"]');
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-label')).toBe('Меню');
  });

  it('renders Menu icon inside trigger', () => {
    cleanup = render(() => <Header />, container);
    const icon = container.querySelector('[data-testid="menu-icon"]');
    expect(icon).not.toBeNull();
  });
});

describe('Header — default modes', () => {
  it('renders all four mode-toggles by default', () => {
    cleanup = render(() => <Header />, container);

    for (const mode of ['dnd', 'resize', 'settings', 'dark']) {
      const el = container.querySelector(`[data-testid="mode-toggle-${mode}"]`);
      expect(el, `mode-toggle-${mode} should be present`).not.toBeNull();
    }
  });

  it('renders ThemePicker by default', () => {
    cleanup = render(() => <Header />, container);
    expect(container.querySelector('[data-testid="theme-picker"]')).not.toBeNull();
  });
});

describe('Header — custom modes subset', () => {
  it('renders only specified modes', () => {
    cleanup = render(
      () => <Header menu={{ modes: ['dnd', 'dark'] }} />,
      container,
    );

    expect(container.querySelector('[data-testid="mode-toggle-dnd"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mode-toggle-dark"]')).not.toBeNull();

    expect(container.querySelector('[data-testid="mode-toggle-resize"]')).toBeNull();
    expect(container.querySelector('[data-testid="mode-toggle-settings"]')).toBeNull();
  });

  it('hides ThemePicker when theme=false', () => {
    cleanup = render(
      () => <Header menu={{ theme: false }} />,
      container,
    );
    expect(container.querySelector('[data-testid="theme-picker"]')).toBeNull();
  });

  it('hides theme group entirely when modes excludes dark and theme=false', () => {
    cleanup = render(
      () => <Header menu={{ modes: ['dnd'], theme: false }} />,
      container,
    );
    // Theme group label should not appear
    const labels = Array.from(container.querySelectorAll('[data-testid="dropdown-label"]'));
    const themeLabel = labels.find((el) => el.textContent === 'Theme');
    expect(themeLabel).toBeUndefined();
  });
});

describe('Header — custom items', () => {
  it('renders custom items with correct labels', () => {
    cleanup = render(
      () => (
        <Header
          menu={{
            items: [
              { label: 'Logout', onSelect: vi.fn() },
              { label: 'Settings', onSelect: vi.fn() },
            ],
          }}
        />
      ),
      container,
    );

    const items = container.querySelectorAll('[data-testid="dropdown-item"]');
    const labels = Array.from(items).map((el) => el.textContent);
    expect(labels).toContain('Logout');
    expect(labels).toContain('Settings');
  });

  it('calls onSelect when a custom item is clicked', () => {
    const handleLogout = vi.fn();
    cleanup = render(
      () => (
        <Header
          menu={{
            items: [{ label: 'Logout', onSelect: handleLogout }],
          }}
        />
      ),
      container,
    );

    const items = container.querySelectorAll('[data-testid="dropdown-item"]');
    const logoutItem = Array.from(items).find((el) => el.textContent === 'Logout');
    expect(logoutItem).not.toBeUndefined();
    (logoutItem as HTMLElement).click();
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });

  it('renders no custom items group when items is empty', () => {
    cleanup = render(
      () => <Header menu={{ items: [] }} />,
      container,
    );

    const items = container.querySelectorAll('[data-testid="dropdown-item"]');
    expect(items).toHaveLength(0);
  });
});

describe('Header — brand slot', () => {
  it('renders brand content', () => {
    cleanup = render(
      () => <Header brand={<span data-testid="brand-logo">MyApp</span>} />,
      container,
    );

    const logo = container.querySelector('[data-testid="brand-logo"]');
    expect(logo).not.toBeNull();
    expect(logo?.textContent).toBe('MyApp');
  });
});
