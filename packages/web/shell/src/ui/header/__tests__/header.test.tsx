/**
 * Header compound unit tests.
 *
 * Coverage:
 *   1. Shell.Header рендерит children (ParentComponent).
 *   2. Shell.Header.Navigation — wrapper mode: рендерит children.
 *   3. Shell.Header.Navigation — batch mode: итерирует data через item.use.
 *   4. Shell.Header.Navigation — item.props маппятся на компонент.
 *   5. Shell.Header.Menu — рендерит trigger с Menu-иконкой и aria-label.
 *   6. Shell.Header.Menu — рендерит children в Content.
 *   7. Shell.Header.Menu — кастомный label для trigger.
 *   8. Shell.Header.Menu.Group / .Label / .Separator — re-export Dropdown.*.
 *   9. Shell.Header.Menu.Item — onSelect вызывается при клике.
 *  10. compound-namespace: Header.Navigation и Header.Menu доступны на Header.
 */

/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Header } from '../header';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

vi.mock('@capsuletech/web-ui/dropdown', () => {
  const Trigger = (props: any) => (
    <button type="button" data-testid="menu-trigger" aria-label={props['aria-label']}>
      {props.children}
    </button>
  );
  const Content = (props: any) => <div data-testid="menu-content">{props.children}</div>;
  const Group = (props: any) => (
    <div data-testid="dropdown-group" class={props.class}>
      {props.children}
    </div>
  );
  const Label = (props: any) => (
    <span data-testid="dropdown-label" class={props.class}>
      {props.children}
    </span>
  );
  const Item = (props: any) => (
    <button
      type="button"
      data-testid="dropdown-item"
      class={props.class}
      onClick={() => props.onSelect?.()}
    >
      {props.children}
    </button>
  );
  const Separator = () => <hr data-testid="dropdown-separator" />;

  const DropdownImpl = (props: any) => <div data-testid="dropdown-root">{props.children}</div>;

  const Dropdown = Object.assign(DropdownImpl, {
    Trigger,
    Content,
    Group,
    Label,
    Item,
    Separator,
  });

  return { Dropdown };
});

vi.mock('@capsuletech/web-ui/button', () => ({
  Button: (props: any) => (
    <button
      type="button"
      data-testid={props['data-testid'] ?? 'ui-button'}
      aria-label={props['aria-label']}
      class={props.class}
    >
      {props.children}
    </button>
  ),
}));

vi.mock('@capsuletech/web-ui/icons', () => ({
  Menu: (props: any) => <svg data-testid="menu-icon" aria-hidden={props['aria-hidden']} />,
}));

// Group stub: wrapper mode passes children, batch mode iterates data via item.use/item.props.
vi.mock('@capsuletech/web-ui/group', () => {
  const { Dynamic } = require('solid-js/web');
  const { For } = require('solid-js');

  const Group = (props: any) => {
    const isBatch = () => props.data !== undefined && props.item?.use !== undefined;
    const getItemProps = props.item?.props ?? ((item: any) => item);

    return (
      <div
        data-testid="group"
        data-orientation={props.orientation ?? 'horizontal'}
        data-variant={props.variant}
        class={props.class}
      >
        {isBatch() ? (
          <For each={props.data}>
            {(item: any) => <Dynamic component={props.item.use} {...getItemProps(item)} />}
          </For>
        ) : (
          props.children
        )}
      </div>
    );
  };

  return { Group };
});

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

describe('Shell.Header — bar container', () => {
  it('renders children (ParentComponent)', () => {
    cleanup = render(
      () => (
        <Header>
          <span data-testid="left-zone">nav</span>
          <span data-testid="right-zone">menu</span>
        </Header>
      ),
      container,
    );

    expect(container.querySelector('[data-testid="left-zone"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="right-zone"]')).not.toBeNull();
  });

  it('has compound sub-components on Header', () => {
    expect(typeof Header.Navigation).toBe('function');
    expect(typeof Header.Menu).toBe('function');
    expect(typeof Header.Menu.Group).toBe('function');
    expect(typeof Header.Menu.Label).toBe('function');
    expect(typeof Header.Menu.Item).toBe('function');
    expect(typeof Header.Menu.Separator).toBe('function');
  });
});

describe('Shell.Header.Navigation — wrapper mode', () => {
  it('renders children when no data/item', () => {
    cleanup = render(
      () => (
        <Header.Navigation>
          <a href="/" data-testid="nav-link-1">
            Dashboard
          </a>
          <a href="/" data-testid="nav-link-2">
            Reports
          </a>
        </Header.Navigation>
      ),
      container,
    );

    expect(container.querySelector('[data-testid="nav-link-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="nav-link-2"]')).not.toBeNull();
  });

  it('defaults to orientation=horizontal', () => {
    cleanup = render(
      () => (
        <Header.Navigation>
          <span>x</span>
        </Header.Navigation>
      ),
      container,
    );

    const group = container.querySelector('[data-testid="group"]');
    expect(group?.getAttribute('data-orientation')).toBe('horizontal');
  });
});

describe('Shell.Header.Navigation — batch mode', () => {
  it('iterates data through item.use', () => {
    const NavItem = (props: { label: string }) => (
      <a href="/" data-testid="batch-item">
        {props.label}
      </a>
    );

    const data = [{ label: 'Dashboard' }, { label: 'Reports' }];

    cleanup = render(
      () => (
        <Header.Navigation
          data={data}
          item={{ use: NavItem, props: (i: any) => ({ label: i.label }) }}
        />
      ),
      container,
    );

    const items = container.querySelectorAll('[data-testid="batch-item"]');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('Dashboard');
    expect(items[1].textContent).toBe('Reports');
  });

  it('forwards variant and orientation to Group', () => {
    const NavItem = (props: { label: string }) => <a href="/">{props.label}</a>;

    cleanup = render(
      () => (
        <Header.Navigation
          data={[{ label: 'A' }]}
          item={{ use: NavItem }}
          orientation="horizontal"
          variant="attached"
        />
      ),
      container,
    );

    const group = container.querySelector('[data-testid="group"]');
    expect(group?.getAttribute('data-orientation')).toBe('horizontal');
    expect(group?.getAttribute('data-variant')).toBe('attached');
  });
});

describe('Shell.Header.Menu — dropdown container', () => {
  it('renders menu trigger with default aria-label', () => {
    cleanup = render(() => <Header.Menu />, container);

    const trigger = container.querySelector('[data-testid="menu-trigger"]');
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-label')).toBe('Меню');
  });

  it('renders Menu icon inside trigger', () => {
    cleanup = render(() => <Header.Menu />, container);

    const icon = container.querySelector('[data-testid="menu-icon"]');
    expect(icon).not.toBeNull();
  });

  it('accepts custom label for trigger', () => {
    cleanup = render(() => <Header.Menu label="Open menu" />, container);

    const trigger = container.querySelector('[data-testid="menu-trigger"]');
    expect(trigger?.getAttribute('aria-label')).toBe('Open menu');
  });

  it('renders children inside Content', () => {
    cleanup = render(
      () => (
        <Header.Menu>
          <span data-testid="menu-child">ModeToggle</span>
        </Header.Menu>
      ),
      container,
    );

    const content = container.querySelector('[data-testid="menu-content"]');
    expect(content).not.toBeNull();
    expect(content?.querySelector('[data-testid="menu-child"]')).not.toBeNull();
  });
});

describe('Shell.Header.Menu sub-helpers', () => {
  it('Menu.Group renders dropdown-group', () => {
    cleanup = render(
      () => (
        <Header.Menu>
          <Header.Menu.Group>
            <span data-testid="inside-group">x</span>
          </Header.Menu.Group>
        </Header.Menu>
      ),
      container,
    );

    expect(container.querySelector('[data-testid="dropdown-group"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="inside-group"]')).not.toBeNull();
  });

  it('Menu.Label renders dropdown-label', () => {
    cleanup = render(
      () => (
        <Header.Menu>
          <Header.Menu.Label>Layout</Header.Menu.Label>
        </Header.Menu>
      ),
      container,
    );

    const label = container.querySelector('[data-testid="dropdown-label"]');
    expect(label).not.toBeNull();
    expect(label?.textContent).toBe('Layout');
  });

  it('Menu.Separator renders dropdown-separator', () => {
    cleanup = render(
      () => (
        <Header.Menu>
          <Header.Menu.Separator />
        </Header.Menu>
      ),
      container,
    );

    expect(container.querySelector('[data-testid="dropdown-separator"]')).not.toBeNull();
  });

  it('Menu.Item calls onSelect on click', () => {
    const handleLogout = vi.fn();

    cleanup = render(
      () => (
        <Header.Menu>
          <Header.Menu.Item onSelect={handleLogout}>Logout</Header.Menu.Item>
        </Header.Menu>
      ),
      container,
    );

    const item = container.querySelector('[data-testid="dropdown-item"]');
    expect(item).not.toBeNull();
    expect(item?.textContent).toBe('Logout');
    (item as HTMLElement).click();
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });
});

describe('Shell.Header — composition (full widget pattern)', () => {
  it('composes Navigation + Menu as children of Header', () => {
    const NavItem = (props: { label: string }) => (
      <a href="/" data-testid="nav-item">
        {props.label}
      </a>
    );

    cleanup = render(
      () => (
        <Header>
          <Header.Navigation
            data={[{ label: 'Dashboard' }, { label: 'Reports' }]}
            item={{ use: NavItem, props: (i: any) => ({ label: i.label }) }}
          />
          <Header.Menu>
            <span data-testid="logout-btn">Logout</span>
          </Header.Menu>
        </Header>
      ),
      container,
    );

    const navItems = container.querySelectorAll('[data-testid="nav-item"]');
    expect(navItems).toHaveLength(2);

    const menuContent = container.querySelector('[data-testid="menu-content"]');
    expect(menuContent?.querySelector('[data-testid="logout-btn"]')).not.toBeNull();
  });
});
