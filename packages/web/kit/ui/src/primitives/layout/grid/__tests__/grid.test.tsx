/**
 * Grid primitive — behaviour tests.
 *
 * Focused on the empty-container contract:
 * - Empty Grid (no children) → gets inline style `min-height: var(--size-slot)`.
 * - Non-empty Grid → no such inline style.
 */
/* @vitest-environment jsdom */
import { onMount } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Grid } from '../grid';

// ---------------------------------------------------------------------------
// Helpers
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
// 0. single instantiation (bug A, ADR 062)
// ---------------------------------------------------------------------------

describe('Grid — instantiates an effectful child exactly once (bug A)', () => {
  it('mounts a child with onMount side-effect a single time', () => {
    let mounts = 0;
    const Probe = () => {
      onMount(() => {
        mounts += 1;
      });
      return <div data-testid="probe">probe</div>;
    };

    cleanup = render(
      () => (
        <Grid>
          <Probe />
        </Grid>
      ),
      container,
    );

    // Регрессия bug A: до фикса `children` утекал в `<Slot {...others}>`
    // параллельно с `children(() => …)` → потомок инстанцировался дважды.
    expect(mounts).toBe(1);
    expect(container.querySelectorAll('[data-testid="probe"]').length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 1. Base class
// ---------------------------------------------------------------------------

describe('Grid — base rendering', () => {
  it('renders a <div> with class "grid" by default', () => {
    cleanup = render(
      () => (
        <Grid>
          <div>child</div>
        </Grid>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('div');
    expect(root.classList.contains('grid')).toBe(true);
  });

  it('uses inline-grid when inline prop is set', () => {
    cleanup = render(
      () => (
        <Grid inline>
          <div>child</div>
        </Grid>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('inline-grid')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. empty container visibility via inline min-height
// ---------------------------------------------------------------------------

describe('Grid — empty container gets inline min-height, non-empty does not', () => {
  it('sets style.min-height to var(--size-slot) when no children are provided', () => {
    cleanup = render(() => <Grid />, container);

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minHeight).toBe('var(--size-slot)');
  });

  it('sets style.min-height to var(--size-slot) when children is explicitly null', () => {
    cleanup = render(() => <Grid>{null}</Grid>, container);

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minHeight).toBe('var(--size-slot)');
  });

  it('does NOT set inline min-height when children are present', () => {
    cleanup = render(
      () => (
        <Grid cols={2}>
          <div data-testid="a">A</div>
          <div data-testid="b">B</div>
        </Grid>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minHeight).toBe('');
    expect(root.classList.contains('grid')).toBe(true);
  });

  it('does NOT set inline min-height when a single child is present', () => {
    cleanup = render(
      () => (
        <Grid>
          <span>single child</span>
        </Grid>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minHeight).toBe('');
  });

  it('does NOT carry min-h-slot class (class replaced by inline style)', () => {
    cleanup = render(() => <Grid />, container);

    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('min-h-slot')).toBe(false);
  });
});
