/**
 * Button — browser-mode A11y tests (Vitest + Playwright / Chromium).
 *
 * Covers:
 *   - Focus-ring (dual-layer, shadcn canon — box-shadow contains "3px")
 *   - Loading state (aria-busy, data-busy, spinner, children replaced)
 *   - aria-invalid (border-destructive styling)
 *   - data-slot="button" (universal selector hook)
 *   - type="button" default (canon expectation)
 *
 * RED-CYCLE POLICY:
 *   Tests marked RED-CYCLE are expected to FAIL on the current implementation.
 *   They document the exact drift item from docs/_meta/canon-button.md that
 *   task 5 (canon drift-fix) must resolve. Do NOT modify button.tsx/variants.ts
 *   to make them pass here — that is task 5's job.
 *
 * INFRA NOTE (Tailwind + OKLCH):
 *   - Tailwind utilities are NOT compiled in the browser test context, so computed
 *     background / border colour checks use token probes (resolveBgToken /
 *     resolveBorderToken) that read through CSS variables set in _browser.setup.ts.
 *   - aria-invalid:border-destructive is a Tailwind class — without CSS injection
 *     it won't compute. The test therefore relies on the setup-injected CSS variable
 *     for the comparison baseline.
 *   - TODO (owner-web-ui): add Tailwind CSS to browser setupFiles so all computed
 *     style assertions are reliable end-to-end.
 *
 * Running:
 *   pnpm --filter @capsuletech/web-ui test:browser
 */

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Button } from '../button';

// ---------------------------------------------------------------------------
// Token helpers — always use probe-based resolution so comparisons are
// format-normalised (browser converts oklch→rgb in getComputedStyle).
// ---------------------------------------------------------------------------

function resolveBorderToken(cssVar: string): string {
  const probe = document.createElement('div');
  probe.style.cssText = `display:none; border-color: var(${cssVar})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).borderTopColor;
  document.body.removeChild(probe);
  return resolved;
}

function resolveColorToken(cssVar: string): string {
  const probe = document.createElement('div');
  probe.style.cssText = `display:none; color: var(${cssVar})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  return resolved;
}

// ---------------------------------------------------------------------------
// Container lifecycle
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
  container.remove();
});

// ---------------------------------------------------------------------------
// 1. data-slot="button"
//
// RED-CYCLE: button.tsx does not set data-slot on <Slot> — task 5 (canon drift-fix).
// ---------------------------------------------------------------------------
describe('Button — data-slot', () => {
  // RED-CYCLE: data-slot="button" not set in button.tsx — task 5 (canon drift-fix).
  it('exposes data-slot="button" on the root element', () => {
    cleanup = render(() => <Button>X</Button>, container);
    const el = container.querySelector('button');
    expect(el?.dataset.slot).toBe('button');
  });
});

// ---------------------------------------------------------------------------
// 2. Focus-ring — dual-layer (shadcn canon)
//
// Canon: focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
// Current: focus-visible:ring-1 focus-visible:ring-ring  ← single thin ring, no border-ring
//
// RED-CYCLE: current ring is ring-1 (1px), canon requires ring-[3px].
//
// INFRA NOTE: :focus-visible styles require Tailwind CSS to be injected AND the
// element to be keyboard-focused in the browser. Without Tailwind, box-shadow is
// "none" regardless of focus state.
// ---------------------------------------------------------------------------
describe('Button — focus-ring', () => {
  // RED-CYCLE: focus ring is ring-1 not ring-[3px] — task 5 (canon drift-fix).
  // Also RED (infra): Tailwind CSS not injected, box-shadow stays "none".
  it('has dual-layer focus ring with 3px ring-width when focused', async () => {
    cleanup = render(() => <Button>Focus me</Button>, container);
    const el = container.querySelector<HTMLButtonElement>('button')!;

    el.focus();
    // Allow browser to apply :focus-visible styles.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const cs = getComputedStyle(el);
    // The 3px ring manifests in the composite box-shadow value (Tailwind ring utility).
    expect(cs.boxShadow).toContain('3px');
  });

  // RED-CYCLE: border-ring on focus-visible not applied in current base — task 5.
  // Also RED (infra): Tailwind CSS not injected.
  it('applies border-ring colour on focus', async () => {
    cleanup = render(() => <Button>Focus me</Button>, container);
    const el = container.querySelector<HTMLButtonElement>('button')!;

    el.focus();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const cs = getComputedStyle(el);
    const ringColor = resolveColorToken('--color-ring');

    if (!ringColor || ringColor === 'rgb(0, 0, 0)') {
      console.warn('[SKIP] --color-ring did not resolve; theme bootstrap may be incomplete');
      return;
    }
    expect(cs.borderTopColor).toBe(ringColor);
  });
});

// ---------------------------------------------------------------------------
// 3. Loading state
//
// RED-CYCLE: aria-busy and data-busy are NOT set in current button.tsx — task 5.
// ---------------------------------------------------------------------------
describe('Button — loading', () => {
  it('renders a spinner element with animate-spin class', () => {
    cleanup = render(() => <Button loading>Sign in</Button>, container);
    const el = container.querySelector<HTMLButtonElement>('button')!;

    const spinner = el.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('does not render the original children text when loading', () => {
    cleanup = render(() => <Button loading>Sign in</Button>, container);
    const el = container.querySelector<HTMLButtonElement>('button')!;

    expect(el.textContent).not.toContain('Sign in');
  });

  it('is disabled when loading', () => {
    cleanup = render(() => <Button loading>Sign in</Button>, container);
    const el = container.querySelector<HTMLButtonElement>('button')!;

    expect(el.disabled).toBe(true);
  });

  // RED-CYCLE: aria-busy="true" not set when loading — task 5 (canon drift-fix).
  it('has aria-busy="true" when loading', () => {
    cleanup = render(() => <Button loading>Sign in</Button>, container);
    const el = container.querySelector<HTMLButtonElement>('button')!;

    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  // RED-CYCLE: data-busy="" not set when loading — task 5 (canon drift-fix).
  it('has data-busy="" when loading (CSS-targeting hook, duplicates aria-busy)', () => {
    cleanup = render(() => <Button loading>Sign in</Button>, container);
    const el = container.querySelector<HTMLButtonElement>('button')!;

    expect(el.hasAttribute('data-busy')).toBe(true);
    expect(el.getAttribute('data-busy')).toBe('');
  });

  it('does not have aria-busy when not loading', () => {
    cleanup = render(() => <Button>Sign in</Button>, container);
    const el = container.querySelector<HTMLButtonElement>('button')!;

    expect(el.getAttribute('aria-busy')).toBeNull();
  });

  it('does not have data-busy when not loading', () => {
    cleanup = render(() => <Button>Sign in</Button>, container);
    const el = container.querySelector<HTMLButtonElement>('button')!;

    expect(el.hasAttribute('data-busy')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. aria-invalid — form validation styling
//
// Canon base includes: aria-invalid:border-destructive aria-invalid:ring-destructive/20
// Current base does NOT include aria-invalid:* classes.
//
// RED-CYCLE: aria-invalid styling not in CVA base — task 5 (canon drift-fix).
// INFRA NOTE: Tailwind CSS not injected, so border-color won't change from
// aria-invalid alone. Once Tailwind CSS is in setupFiles this test will fail
// strictly for the canon-drift reason (no aria-invalid: class), not infra.
// ---------------------------------------------------------------------------
describe('Button — aria-invalid', () => {
  // RED-CYCLE: aria-invalid:border-destructive not in CVA base — task 5 (canon drift-fix).
  it('shows destructive border colour when aria-invalid="true"', () => {
    cleanup = render(
      () => (
        <Button aria-invalid="true">Submit</Button>
      ),
      container,
    );
    const el = container.querySelector<HTMLButtonElement>('button')!;
    const cs = getComputedStyle(el);

    const destructiveColor = resolveBorderToken('--color-destructive');
    if (!destructiveColor || destructiveColor === 'rgb(0, 0, 0)') {
      console.warn('[SKIP] --color-destructive did not resolve');
      return;
    }

    expect(cs.borderTopColor).toBe(destructiveColor);
  });

  it('does NOT show destructive border colour without aria-invalid', () => {
    cleanup = render(() => <Button>Submit</Button>, container);
    const el = container.querySelector<HTMLButtonElement>('button')!;
    const cs = getComputedStyle(el);

    const destructiveColor = resolveBorderToken('--color-destructive');
    if (!destructiveColor || destructiveColor === 'rgb(0, 0, 0)') {
      console.warn('[SKIP] --color-destructive did not resolve');
      return;
    }

    // Without aria-invalid, border should NOT be destructive colour.
    expect(cs.borderTopColor).not.toBe(destructiveColor);
  });
});

// ---------------------------------------------------------------------------
// 5. type="button" default
//
// Canon (from Kobalte docs): Kobalte Button sets type="button" to prevent
// accidental form submission. Our current Slot forwarding must preserve this.
//
// SÜRPRIZ / RED-CYCLE: current button.tsx does NOT explicitly pass type="button"
// to <Slot>, and Kobalte's Polymorphic layer does not inject it automatically
// when used via our Slot abstraction. task 5 must either pass type="button"
// explicitly in button.tsx or verify Kobalte does it.
// ---------------------------------------------------------------------------
describe('Button — type attribute', () => {
  // RED-CYCLE: type="button" not forwarded by Slot wrapper — task 5 must
  // either pass type="button" prop explicitly or confirm Kobalte injects it.
  it('has type="button" by default to prevent accidental form submission', () => {
    cleanup = render(() => <Button>Click</Button>, container);
    const el = container.querySelector<HTMLButtonElement>('button')!;
    expect(el.getAttribute('type')).toBe('button');
  });
});
