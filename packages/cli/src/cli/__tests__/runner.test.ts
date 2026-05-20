import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isCi } from '../runner';

describe('isCi', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    // Isolate env mutations per test
    process.env = { ...ORIGINAL_ENV };
    delete process.env.CAPSULE_CI;
    delete process.env.CI;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns true when CAPSULE_CI=1', () => {
    process.env.CAPSULE_CI = '1';
    expect(isCi()).toBe(true);
  });

  it('returns true when CI=true', () => {
    process.env.CI = 'true';
    expect(isCi()).toBe(true);
  });

  it('returns false when neither env var is set', () => {
    expect(isCi()).toBe(false);
  });
});
