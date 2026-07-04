/* @vitest-environment jsdom */

/**
 * Prose primitive — render + descendant-typography contract tests.
 *
 * Covers: innerHTML injection, children mode, size variant descendant classes,
 * table styling (main case), polymorphic `as`, class/style passthrough.
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prose } from '../prose';

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
// content injection
// ---------------------------------------------------------------------------

describe('Prose — innerHTML injection', () => {
  it('injects rendered-markdown html into the root element', () => {
    cleanup = render(
      () => <Prose data-testid="p" innerHTML="<h2>Title</h2><p>Body</p>" />,
      container,
    );
    const el = container.querySelector('[data-testid="p"]');
    expect(el?.querySelector('h2')?.textContent).toBe('Title');
    expect(el?.querySelector('p')?.textContent).toBe('Body');
  });

  it('renders a table from injected html (main case)', () => {
    cleanup = render(
      () => (
        <Prose
          data-testid="p"
          innerHTML="<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>C</td></tr></tbody></table>"
        />
      ),
      container,
    );
    const el = container.querySelector('[data-testid="p"]');
    expect(el?.querySelector('table th')?.textContent).toBe('H');
    expect(el?.querySelector('table td')?.textContent).toBe('C');
  });
});

describe('Prose — children mode', () => {
  it('renders JSX children when innerHTML is absent', () => {
    cleanup = render(
      () => (
        <Prose data-testid="p">
          <h2>From JSX</h2>
        </Prose>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="p"]');
    expect(el?.querySelector('h2')?.textContent).toBe('From JSX');
  });
});

// ---------------------------------------------------------------------------
// descendant typography classes
// ---------------------------------------------------------------------------

describe('Prose — descendant typography classes', () => {
  it('carries table structural selectors on the root', () => {
    cleanup = render(() => <Prose data-testid="p" innerHTML="<p>x</p>" />, container);
    const cls = container.querySelector('[data-testid="p"]')?.className ?? '';
    // border-collapse + per-cell borders + zebra — grammar-table styling
    expect(cls).toContain('[&_table]:border-collapse');
    expect(cls).toContain('[&_td]:border');
    expect(cls).toContain('[&_th]:bg-muted');
    expect(cls).toContain('[&_tbody_tr:nth-child(even)]:bg-muted/40');
  });

  it('carries heading + list + code + blockquote selectors', () => {
    cleanup = render(() => <Prose data-testid="p" innerHTML="<p>x</p>" />, container);
    const cls = container.querySelector('[data-testid="p"]')?.className ?? '';
    expect(cls).toContain('[&_h1]:font-extrabold');
    expect(cls).toContain('[&_h2]:border-b');
    expect(cls).toContain('[&_ul]:list-disc');
    expect(cls).toContain('[&_code]:bg-muted');
    expect(cls).toContain('[&_blockquote]:border-l-2');
    expect(cls).toContain('[&_a]:text-primary');
  });

  it('uses only design-token colors (no raw hex)', () => {
    cleanup = render(() => <Prose data-testid="p" innerHTML="<p>x</p>" />, container);
    const cls = container.querySelector('[data-testid="p"]')?.className ?? '';
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});

// ---------------------------------------------------------------------------
// size variant
// ---------------------------------------------------------------------------

describe('Prose — size variant', () => {
  it('md (default): document-scale heading + table sizes', () => {
    cleanup = render(() => <Prose data-testid="p" innerHTML="<p>x</p>" />, container);
    const cls = container.querySelector('[data-testid="p"]')?.className ?? '';
    expect(cls).toContain('[&_h1]:text-3xl');
    expect(cls).toContain('[&_table]:text-sm');
    expect(cls).toContain('text-base');
  });

  it('sm: compact heading + table sizes', () => {
    cleanup = render(() => <Prose data-testid="p" size="sm" innerHTML="<p>x</p>" />, container);
    const cls = container.querySelector('[data-testid="p"]')?.className ?? '';
    expect(cls).toContain('[&_h1]:text-xl');
    expect(cls).toContain('[&_table]:text-xs');
    expect(cls).toContain('text-sm');
    // no md-scale leakage
    expect(cls).not.toContain('[&_h1]:text-3xl');
  });

  it('updates classes reactively when size signal changes', () => {
    const [size, setSize] = createSignal<'sm' | 'md'>('md');
    cleanup = render(() => <Prose data-testid="p" size={size()} innerHTML="<p>x</p>" />, container);
    const el = container.querySelector('[data-testid="p"]');
    expect(el?.className).toContain('[&_h1]:text-3xl');

    setSize('sm');
    expect(el?.className).toContain('[&_h1]:text-xl');
    expect(el?.className).not.toContain('[&_h1]:text-3xl');
  });
});

// ---------------------------------------------------------------------------
// polymorphism + passthrough
// ---------------------------------------------------------------------------

describe('Prose — polymorphism & passthrough', () => {
  it('renders a <div> by default', () => {
    cleanup = render(() => <Prose data-testid="p" innerHTML="<p>x</p>" />, container);
    const el = container.querySelector('[data-testid="p"]');
    expect(el?.tagName.toLowerCase()).toBe('div');
  });

  it('renders custom tag via as="article"', () => {
    cleanup = render(() => <Prose data-testid="p" as="article" innerHTML="<p>x</p>" />, container);
    const el = container.querySelector('[data-testid="p"]');
    expect(el?.tagName.toLowerCase()).toBe('article');
  });

  it('forwards custom class', () => {
    cleanup = render(
      () => <Prose data-testid="p" class="custom-x" innerHTML="<p>x</p>" />,
      container,
    );
    const el = container.querySelector('[data-testid="p"]');
    expect(el?.className).toContain('custom-x');
  });
});
