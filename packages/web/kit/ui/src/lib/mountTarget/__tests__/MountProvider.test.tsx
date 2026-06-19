/**
 * MountProvider / useMountTarget — unit tests.
 *
 * Covered:
 *   1. Default behavior — without a Provider `useMountTarget()` returns an Accessor
 *      that gives `undefined` (fallback to Kobalte default = document.body).
 *   2. Static HTMLElement value — `<MountProvider value={el}>` makes
 *      `useMountTarget()()` return `el`.
 *   3. Accessor (getter) value — `<MountProvider value={() => el()}>` passes
 *      the accessor through; reactively updates when the signal changes.
 *   4. Nested override — inner Provider wins over outer Provider.
 */
/* @vitest-environment jsdom */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MountProvider, useMountTarget } from '../MountProvider';

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
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// 1. Default behavior (no Provider)
// ---------------------------------------------------------------------------

describe('useMountTarget — no Provider', () => {
  it('returns an Accessor that gives undefined', () => {
    let result: HTMLElement | undefined = 'sentinel' as unknown as HTMLElement | undefined;

    cleanup = render(
      () => {
        const mount = useMountTarget();
        result = mount();
        return <></>;
      },
      container,
    );

    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Static HTMLElement value
// ---------------------------------------------------------------------------

describe('useMountTarget — static HTMLElement value', () => {
  it('returns the provided element from context', () => {
    const target = document.createElement('div');
    let result: HTMLElement | undefined;

    cleanup = render(
      () => (
        <MountProvider value={target}>
          {(() => {
            const mount = useMountTarget();
            result = mount();
            return <></>;
          })()}
        </MountProvider>
      ),
      container,
    );

    expect(result).toBe(target);
  });

  it('returns undefined when provided undefined as static value', () => {
    let result: HTMLElement | undefined = 'sentinel' as unknown as HTMLElement | undefined;

    cleanup = render(
      () => (
        <MountProvider value={undefined}>
          {(() => {
            const mount = useMountTarget();
            result = mount();
            return <></>;
          })()}
        </MountProvider>
      ),
      container,
    );

    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Accessor (getter) value — reactive updates
// ---------------------------------------------------------------------------

describe('useMountTarget — Accessor value', () => {
  it('passes the accessor through and returns its current value', () => {
    const el = document.createElement('section');
    const [getEl] = createSignal<HTMLElement | undefined>(el);
    let mountAccessor: (() => HTMLElement | undefined) | undefined;

    cleanup = render(
      () => (
        <MountProvider value={getEl}>
          {(() => {
            mountAccessor = useMountTarget();
            return <></>;
          })()}
        </MountProvider>
      ),
      container,
    );

    expect(mountAccessor).toBeDefined();
    expect(mountAccessor?.()).toBe(el);
  });

  it('reflects signal changes reactively when accessor is provided', () => {
    const el1 = document.createElement('article');
    const el2 = document.createElement('aside');
    const [getEl, setEl] = createSignal<HTMLElement | undefined>(el1);
    let mountAccessor: (() => HTMLElement | undefined) | undefined;

    cleanup = render(
      () => (
        <MountProvider value={getEl}>
          {(() => {
            mountAccessor = useMountTarget();
            return <></>;
          })()}
        </MountProvider>
      ),
      container,
    );

    expect(mountAccessor?.()).toBe(el1);
    setEl(el2);
    expect(mountAccessor?.()).toBe(el2);
  });
});

// ---------------------------------------------------------------------------
// 4. Nested override — inner Provider wins
// ---------------------------------------------------------------------------

describe('useMountTarget — nested Provider override', () => {
  it('inner Provider value overrides outer Provider value', () => {
    const outerEl = document.createElement('div');
    const innerEl = document.createElement('section');
    let outerResult: HTMLElement | undefined;
    let innerResult: HTMLElement | undefined;

    cleanup = render(
      () => (
        <MountProvider value={outerEl}>
          {(() => {
            const mount = useMountTarget();
            outerResult = mount();
            return (
              <MountProvider value={innerEl}>
                {(() => {
                  const mountInner = useMountTarget();
                  innerResult = mountInner();
                  return <></>;
                })()}
              </MountProvider>
            );
          })()}
        </MountProvider>
      ),
      container,
    );

    expect(outerResult).toBe(outerEl);
    expect(innerResult).toBe(innerEl);
  });
});
