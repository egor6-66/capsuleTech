/**
 * Card primitive — finish integration tests.
 *
 * Activation is driven by the global `useFinishMode()` signal from
 * `@capsuletech/web-style` (same as createFinish after the signal-refactor).
 *
 * Style composition contract:
 *   OFF: surfaceStyle() → {}
 *        Card's Tailwind class `bg-card` supplies the background.
 *        No inline background, no inline box-shadow → class-level `shadow` wins.
 *   ON:  surfaceStyle() → { background: linear-gradient(…), box-shadow: … }
 *        Inline background overrides bg-card → gradient shows.
 *        Inline box-shadow overrides class `shadow` → no double-shadow.
 */
/* @vitest-environment jsdom */

import type { IFinishConfig } from '@capsuletech/web-style';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks for useFinishMode / useFinishConfig — set up BEFORE any imports.
// ---------------------------------------------------------------------------

let _finishModeValue = false;
const _defaultConfig: IFinishConfig = {
  topForegroundAlpha: 0.09,
  topStopPosition: 0,
  midCardAlpha: 0.70,
  midStopPosition: 45,
  bottomPrimaryAlpha: 0.18,
  bottomStopPosition: 100,
  hairlineAlpha: 0.40,
  innerBorderAlpha: 0.06,
  contactShadow: '0 1px 2px rgb(0 0 0 / 0.4)',
  glowAlpha: 0.22,
  glowSpread: '0 8px 24px',
  innerOnly: false,
  centerGlowAlpha: 0,
  centerGlowSize: '60%',
  surfaceAlpha: 1,
  innerGlowAlpha: 0,
};

vi.mock('@capsuletech/web-style', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-style')>();
  return {
    ...actual,
    useFinishMode: () => () => _finishModeValue,
    useFinishConfig: () => () => _defaultConfig,
  };
});

import { createRoot } from 'solid-js';
import { render } from 'solid-js/web';
import { createFinish } from '../../../lib/finish';
import { Card } from '../card';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  _finishModeValue = false;
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

// ---------------------------------------------------------------------------
// 1. DOM render tests — OFF state
// ---------------------------------------------------------------------------

describe('Card — finish OFF (useFinishMode = false)', () => {
  it('renders a div element', () => {
    cleanup = render(() => <Card data-testid="card">content</Card>, container);
    const card = container.querySelector('[data-testid="card"]');
    expect(card).not.toBeNull();
    expect(card?.tagName.toLowerCase()).toBe('div');
  });

  it('has NO inline background when finish is off (class bg-card takes over)', () => {
    cleanup = render(() => <Card data-testid="card">content</Card>, container);
    const card = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(card).not.toBeNull();
    expect(card!.style.background).toBe('');
  });

  it('does NOT inject an inline box-shadow when finish is off', () => {
    cleanup = render(() => <Card data-testid="card">content</Card>, container);
    const card = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(card).not.toBeNull();
    expect(card!.style.boxShadow).toBe('');
  });

  it('carries the card CVA classes (rounded-lg, border, shadow)', () => {
    cleanup = render(() => <Card data-testid="card">content</Card>, container);
    const card = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(card).not.toBeNull();
    expect(card!.className).toContain('rounded-lg');
    expect(card!.className).toContain('border');
    expect(card!.className).toContain('shadow');
  });
});

// ---------------------------------------------------------------------------
// 2. Reactive signal tests — ON state
//
// We test via createRoot + createFinish directly, mirroring the contract test
// in lib/finish/__tests__/createFinish.test.ts, to avoid jsdom scheduler timing.
// ---------------------------------------------------------------------------

describe('Card — finish ON (useFinishMode = true) — reactive contract', () => {
  it('surfaceStyle() returns gradient background when signal is true', () => {
    createRoot((dispose) => {
      _finishModeValue = true;
      const finish = createFinish();
      expect(finish.surfaceStyle().background).toContain('linear-gradient');
      dispose();
    });
  });

  it('surfaceStyle() includes inline box-shadow (hairline inset) when ON', () => {
    createRoot((dispose) => {
      _finishModeValue = true;
      const finish = createFinish();
      const shadow = finish.surfaceStyle()['box-shadow'];
      expect(shadow).toBeDefined();
      expect(shadow).toContain('inset');
      dispose();
    });
  });

  it('surfaceStyle() returns {} when signal is false', () => {
    createRoot((dispose) => {
      _finishModeValue = false;
      const finish = createFinish();
      expect(finish.surfaceStyle()).toEqual({});
      dispose();
    });
  });
});
