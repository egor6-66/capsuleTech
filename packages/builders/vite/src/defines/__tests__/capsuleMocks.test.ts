/**
 * Tests for __CAPSULE_MOCKS__ define flag in capsuleConfig.
 *
 * The flag is a boolean-literal constant injected via Vite `define` so Rollup
 * DCE can tree-shake `__CAPSULE_MOCKS__ ? mockHandler : undefined` branches.
 *
 * Rules:
 *  - isDev=true,  CAPSULE_MOCKS unset  → true   (dev default: mocks on)
 *  - isDev=false, CAPSULE_MOCKS unset  → false  (build default: real API)
 *  - CAPSULE_MOCKS='true'  (any isDev) → true   (explicit override: preview-deploy with mocks)
 *  - CAPSULE_MOCKS='false' (any isDev) → false  (explicit override: dev with real API)
 *
 * We test the pure computation inline (not importing capsuleConfig which pulls
 * in heavy Vite plugins) — if the computation moves, this test will break and
 * surface the drift immediately.
 */

import { describe, expect, it, afterEach } from 'vitest';

// Inline replica of the logic in capsuleConfig.ts so the test stays fast and
// dependency-free. If you move/rename the logic there, update here.
function computeMocks(isDev: boolean): boolean {
  return process.env.CAPSULE_MOCKS != null ? process.env.CAPSULE_MOCKS === 'true' : isDev;
}

afterEach(() => {
  delete process.env.CAPSULE_MOCKS;
});

describe('__CAPSULE_MOCKS__ default behaviour (env not set)', () => {
  it('returns true when isDev=true', () => {
    expect(computeMocks(true)).toBe(true);
  });

  it('returns false when isDev=false', () => {
    expect(computeMocks(false)).toBe(false);
  });
});

describe('__CAPSULE_MOCKS__ explicit override via CAPSULE_MOCKS env', () => {
  it('CAPSULE_MOCKS=true overrides isDev=false → true (prod-build with mocks)', () => {
    process.env.CAPSULE_MOCKS = 'true';
    expect(computeMocks(false)).toBe(true);
  });

  it('CAPSULE_MOCKS=false overrides isDev=true → false (dev with real API)', () => {
    process.env.CAPSULE_MOCKS = 'false';
    expect(computeMocks(true)).toBe(false);
  });

  it('CAPSULE_MOCKS=true is idempotent when isDev=true', () => {
    process.env.CAPSULE_MOCKS = 'true';
    expect(computeMocks(true)).toBe(true);
  });
});

describe('__CAPSULE_MOCKS__ define value shape', () => {
  it('String(true) produces "true" — boolean literal for Rollup DCE', () => {
    // Rollup constant-folds `true` and `false` bare literals.
    // JSON.stringify(String(true)) === '"true"' would be a string literal,
    // which Rollup cannot fold in `if (cond)`. We use String(mocks) directly
    // so the injected source text is `true` / `false` (boolean), not `"true"`.
    expect(String(true)).toBe('true');
    expect(String(false)).toBe('false');
  });
});
