/**
 * Guard tests: Matrix throws a descriptive error when `main` slot is absent
 * but other slots are provided (grid / resize path).
 *
 * The centroid path (only `main`) already guards via its own throw inside
 * `renderCentroid` — that case is covered here too for completeness.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Matrix } from '../matrix';

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

describe('Matrix — missing main guard', () => {
  it('throws when slots has sidebar but no main (grid path)', () => {
    expect(() => {
      cleanup = render(
        () => (
          <Matrix
            slots={
              {
                sidebar: { children: <div>Sidebar</div> },
                // main intentionally omitted — simulates runtime JS misuse
              } as never
            }
          />
        ),
        container,
      );
    }).toThrow('Layout.Matrix: `main` slot is required');
  });

  it('throws when slots has header + footer but no main (grid path)', () => {
    expect(() => {
      cleanup = render(
        () => (
          <Matrix
            slots={
              {
                header: { children: <div>Header</div> },
                footer: { children: <div>Footer</div> },
              } as never
            }
          />
        ),
        container,
      );
    }).toThrow('Layout.Matrix: `main` slot is required');
  });

  it('throws when slots has resizable sidebar but no main (resize path)', () => {
    expect(() => {
      cleanup = render(
        () => (
          <Matrix
            slots={
              {
                sidebar: { children: <div>Sidebar</div>, resizable: true },
              } as never
            }
          />
        ),
        container,
      );
    }).toThrow('Layout.Matrix: `main` slot is required');
  });

  it('does NOT throw when only main is provided (centroid path)', () => {
    expect(() => {
      cleanup = render(
        () => (
          <Matrix
            slots={{
              main: { children: <div data-testid="content">Hello</div> },
            }}
          />
        ),
        container,
      );
    }).not.toThrow();

    expect(container.querySelector('[data-testid="content"]')).not.toBeNull();
  });

  it('does NOT throw when main + sidebar are both provided (grid path)', () => {
    expect(() => {
      cleanup = render(
        () => (
          <Matrix
            slots={{
              main: { children: <div data-testid="main-ok">Main</div> },
              sidebar: { children: <div>Side</div> },
            }}
          />
        ),
        container,
      );
    }).not.toThrow();

    expect(container.querySelector('[data-testid="main-ok"]')).not.toBeNull();
  });
});
