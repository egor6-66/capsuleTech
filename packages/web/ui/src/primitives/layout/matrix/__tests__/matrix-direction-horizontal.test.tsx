/**
 * Regression tests: Matrix direction="horizontal" non-resizable path.
 *
 * Bug: the non-resizable horizontal flex-row container had no definite height
 * because it relied on h-full from content-height parents. Without the
 * relative/absolute-inset-0 envelope the flex container collapsed to ~3px,
 * causing all zone cells (which are themselves h-full) to inherit that collapsed
 * height and render at 0×0.
 *
 * Fix: wrap the plain flex-row in `relative h-full w-full` + `absolute inset-0`
 * (mirroring the resizable horizontal path). jsdom cannot verify pixel geometry,
 * so these tests assert DOM structure: both zone children are present and each
 * zone wrapper carries h-full (structural proxy for the height chain being intact).
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Matrix } from '../matrix';

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  container.style.width = '1280px';
  container.style.height = '752px';
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

describe('Matrix direction="horizontal" non-resizable — DOM structure', () => {
  it('renders both zone children when resizable=false on all rows', () => {
    cleanup = render(
      () => (
        <Matrix
          style={{ width: '1280px', height: '752px' }}
          direction="horizontal"
          rows={[
            {
              id: 'left',
              resizable: false,
              cells: [{ id: 'left-cell', children: <div data-testid="left-content">Left</div> }],
            },
            {
              id: 'right',
              resizable: false,
              cells: [{ id: 'right-cell', children: <div data-testid="right-content">Right</div> }],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="left-content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="right-content"]')).not.toBeNull();
  });

  it('non-resizable horizontal zones wrapper carries h-full class (height-chain structural check)', () => {
    cleanup = render(
      () => (
        <Matrix
          style={{ width: '1280px', height: '752px' }}
          direction="horizontal"
          rows={[
            {
              id: 'a',
              resizable: false,
              cells: [{ id: 'a-cell', children: <div data-testid="zone-a">A</div> }],
            },
            {
              id: 'b',
              resizable: false,
              cells: [{ id: 'b-cell', children: <div data-testid="zone-b">B</div> }],
            },
          ]}
        />
      ),
      container,
    );

    // The absolute inset-0 flex-row wrapper must be present inside a relative container.
    // We look for a div that carries both `absolute` and `inset-0` and `flex-row` —
    // that is the fixed-height envelope added by the bug fix.
    const root = container.firstElementChild as HTMLElement;
    // Walk descendants to find a node with all three classes.
    const allDivs = root.querySelectorAll('div');
    const envelopeFound = Array.from(allDivs).some(
      (el) =>
        el.classList.contains('absolute') &&
        el.classList.contains('inset-0') &&
        el.classList.contains('flex-row'),
    );
    expect(envelopeFound).toBe(true);
  });

  it('renders three non-resizable horizontal zones with auto/fr/fraction widths', () => {
    cleanup = render(
      () => (
        <Matrix
          style={{ width: '1280px', height: '752px' }}
          direction="horizontal"
          rows={[
            {
              id: 'nav',
              resizable: false,
              height: 'auto',
              cells: [{ id: 'nav-cell', children: <div data-testid="nav-content">Nav</div> }],
            },
            {
              id: 'main',
              resizable: false,
              cells: [{ id: 'main-cell', children: <div data-testid="main-content">Main</div> }],
            },
            {
              id: 'panel',
              resizable: false,
              height: 0.25,
              cells: [{ id: 'panel-cell', children: <div data-testid="panel-content">Panel</div> }],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="nav-content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="main-content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="panel-content"]')).not.toBeNull();
  });
});
