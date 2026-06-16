/**
 * Field primitive — DOM tests.
 *
 * Covered:
 *   - Field renders a div[role=group][data-slot=field].
 *   - Field.Content renders div[data-slot=field-content] with base classes.
 *   - Field.Content passes extra class through.
 *   - Field.Label renders data-slot=field-label.
 *   - Field.Description renders data-slot=field-description.
 *   - Field.Error renders when errors are provided.
 *   - Field.Error is absent when errors array is empty.
 */
/* @vitest-environment jsdom */

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Field } from '../index';

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
// Field root
// ---------------------------------------------------------------------------

describe('Field root', () => {
  it('renders a div with role=group and data-slot=field', () => {
    cleanup = render(() => <Field>content</Field>, container);
    const el = container.querySelector('[data-slot="field"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('role')).toBe('group');
    expect(el?.tagName.toLowerCase()).toBe('div');
  });

  it('applies orientation=vertical classes by default', () => {
    cleanup = render(() => <Field>content</Field>, container);
    const el = container.querySelector<HTMLElement>('[data-slot="field"]');
    expect(el?.className).toContain('flex-col');
  });
});

// ---------------------------------------------------------------------------
// Field.Content — base
// ---------------------------------------------------------------------------

describe('Field.Content — base', () => {
  it('renders a div with data-slot=field-content', () => {
    cleanup = render(() => <Field.Content>child</Field.Content>, container);
    const el = container.querySelector('[data-slot="field-content"]');
    expect(el).not.toBeNull();
    expect(el?.tagName.toLowerCase()).toBe('div');
  });

  it('has base layout classes', () => {
    cleanup = render(() => <Field.Content>child</Field.Content>, container);
    const el = container.querySelector<HTMLElement>('[data-slot="field-content"]');
    expect(el?.className).toContain('flex');
    expect(el?.className).toContain('flex-col');
    expect(el?.className).toContain('gap-1.5');
  });

  it('passes extra class through', () => {
    cleanup = render(() => <Field.Content class="my-custom-class">child</Field.Content>, container);
    const el = container.querySelector<HTMLElement>('[data-slot="field-content"]');
    expect(el?.className).toContain('my-custom-class');
  });
});

// ---------------------------------------------------------------------------
// Other parts — smoke
// ---------------------------------------------------------------------------

describe('Field.Label', () => {
  it('renders with data-slot=field-label', () => {
    cleanup = render(() => <Field.Label>Name</Field.Label>, container);
    const el = container.querySelector('[data-slot="field-label"]');
    expect(el).not.toBeNull();
  });
});

describe('Field.Description', () => {
  it('renders with data-slot=field-description', () => {
    cleanup = render(() => <Field.Description>Helper text</Field.Description>, container);
    const el = container.querySelector('[data-slot="field-description"]');
    expect(el).not.toBeNull();
  });
});

describe('Field.Error', () => {
  it('renders when errors array is non-empty', () => {
    cleanup = render(() => <Field.Error errors={[{ message: 'Required' }]} />, container);
    const el = container.querySelector('[data-slot="field-error"]');
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain('Required');
  });

  it('is absent when errors array is empty', () => {
    cleanup = render(() => <Field.Error errors={[]} />, container);
    const el = container.querySelector('[data-slot="field-error"]');
    expect(el).toBeNull();
  });
});
