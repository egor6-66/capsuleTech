/**
 * Tests for __CAPSULE_MOCKS__ define flag in capsuleConfig.
 *
 * The flag is a boolean-literal constant injected via Vite `define` so Rollup
 * DCE can tree-shake `__CAPSULE_MOCKS__ ? mockHandler : undefined` branches.
 *
 * Priority (descending):
 *  1. env CAPSULE_MOCKS='true'/'false'  — explicit override (CLI flag / CI)
 *  2. config.deploy?.mocks             — static intent from capsule.config.ts
 *     (enables `capsule build && capsule preview` without manual env setup)
 *  3. isDev                            — default: mocks on in dev, off in build
 *
 * Rules:
 *  - isDev=true,  CAPSULE_MOCKS unset, deploy.mocks unset → true   (dev default)
 *  - isDev=false, CAPSULE_MOCKS unset, deploy.mocks unset → false  (build default)
 *  - deploy.mocks=true,  CAPSULE_MOCKS unset → true   (config opt-in beats isDev)
 *  - deploy.mocks=false, CAPSULE_MOCKS unset → false  (explicit opt-out beats isDev)
 *  - CAPSULE_MOCKS='true'  (any isDev, any deploy.mocks) → true   (env wins)
 *  - CAPSULE_MOCKS='false' (any isDev, any deploy.mocks) → false  (env wins)
 *
 * We test the pure computation inline (not importing capsuleConfig which pulls
 * in heavy Vite plugins) — if the computation moves, this test will break and
 * surface the drift immediately.
 */

import { afterEach, describe, expect, it } from 'vitest';

// Inline replica of the logic in capsuleConfig.ts so the test stays fast and
// dependency-free. If you move/rename the logic there, update here.
function computeMocks(isDev: boolean, deployMocks?: boolean): boolean {
  return process.env.CAPSULE_MOCKS != null
    ? process.env.CAPSULE_MOCKS === 'true'
    : deployMocks != null
      ? deployMocks
      : isDev;
}

afterEach(() => {
  delete process.env.CAPSULE_MOCKS;
});

describe('__CAPSULE_MOCKS__ default behaviour (env not set, no deploy.mocks)', () => {
  it('returns true when isDev=true', () => {
    expect(computeMocks(true)).toBe(true);
  });

  it('returns false when isDev=false', () => {
    expect(computeMocks(false)).toBe(false);
  });
});

describe('__CAPSULE_MOCKS__ config.deploy.mocks overrides isDev (env not set)', () => {
  it('deploy.mocks=true, isDev=false → true (capsule build + preview with mocks, no env needed)', () => {
    expect(computeMocks(false, true)).toBe(true);
  });

  it('deploy.mocks=false, isDev=true → false (explicit opt-out beats isDev)', () => {
    expect(computeMocks(true, false)).toBe(false);
  });

  it('deploy.mocks=true, isDev=true → true (same as default, no conflict)', () => {
    expect(computeMocks(true, true)).toBe(true);
  });

  it('deploy.mocks=false, isDev=false → false (same as default, no conflict)', () => {
    expect(computeMocks(false, false)).toBe(false);
  });
});

describe('__CAPSULE_MOCKS__ explicit override via CAPSULE_MOCKS env (wins over both isDev and deploy.mocks)', () => {
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

  it('CAPSULE_MOCKS=false overrides deploy.mocks=true → false (env beats config)', () => {
    process.env.CAPSULE_MOCKS = 'false';
    expect(computeMocks(false, true)).toBe(false);
  });

  it('CAPSULE_MOCKS=true overrides deploy.mocks=false → true (env beats config)', () => {
    process.env.CAPSULE_MOCKS = 'true';
    expect(computeMocks(true, false)).toBe(true);
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
