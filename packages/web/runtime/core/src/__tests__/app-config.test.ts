/**
 * app-config.test.ts
 *
 * Characterization tests for IAppConfig.remotes (ADR 060 Phase 2 / D5).
 *
 * Contracts:
 *  1. defineAppConfig accepts a `remotes` array of { name, url, contract? }.
 *  2. `contract` is optional on a remote entry.
 *  3. `remotes` is a host-side registry — NOT in APP_CONFIG_KEYS (not override-able by a remote).
 */

import { describe, expect, it } from 'vitest';
import { APP_CONFIG_KEYS, defineAppConfig } from '../app-config';

describe('IAppConfig.remotes', () => {
  it('accepts a remotes registry (contract optional)', () => {
    const config = defineAppConfig({
      remotes: [
        { name: 'canvas', url: 'https://canvas.example.com' },
        { name: 'editor', url: 'https://editor.example.com', contract: '/custom/contract' },
      ],
    });

    expect(config.remotes).toHaveLength(2);
    expect(config.remotes?.[0]).toEqual({ name: 'canvas', url: 'https://canvas.example.com' });
    expect(config.remotes?.[1].contract).toBe('/custom/contract');
  });

  it('is a host-side registry — not in the override whitelist', () => {
    // APP_CONFIG_KEYS is the whitelist of keys a host-override patch may set.
    // `remotes` must NOT be override-able by an embedded remote (ADR 059 D4).
    expect(APP_CONFIG_KEYS as readonly string[]).not.toContain('remotes');
  });
});
