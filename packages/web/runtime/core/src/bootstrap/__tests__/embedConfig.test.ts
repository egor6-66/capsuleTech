/* @vitest-environment jsdom */
/**
 * embedConfig.test.ts
 *
 * Unit tests for the embed config-override store + merge (ADR 059 Phase 1, D4).
 *
 * Contracts:
 *  - filterOverride drops keys not in the IAppConfig schema (APP_CONFIG_KEYS).
 *  - mergeConfigOverride: per-key shallow, host wins; missing key = app default;
 *    unknown key dropped; base not mutated.
 *  - createConfigStore: initial = base; applyOverride re-merges reactively;
 *    empty / all-unknown patch = no-op.
 */

import { createComputed, createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import type { IAppConfig } from '../../app-config';
import { createConfigStore, filterOverride, mergeConfigOverride } from '../embedConfig';

describe('filterOverride', () => {
  it('keeps known IAppConfig keys', () => {
    const out = filterOverride({ router: { notFoundRedirect: '/x' }, access: { admin: ['*'] } });
    expect(out).toEqual({ router: { notFoundRedirect: '/x' }, access: { admin: ['*'] } });
  });

  it('drops keys not in the schema', () => {
    const out = filterOverride({ router: { transition: true }, serverUrl: 'https://x', theme: 'dark' });
    expect(out).toEqual({ router: { transition: true } });
    expect(out).not.toHaveProperty('serverUrl');
    expect(out).not.toHaveProperty('theme');
  });

  it('returns empty object when all keys are unknown', () => {
    expect(filterOverride({ foo: 1, bar: 2 })).toEqual({});
  });
});

describe('mergeConfigOverride', () => {
  const base: IAppConfig = { router: { notFoundRedirect: '/home' }, access: { admin: ['*'] } };

  it('host wins per-key, missing key keeps app default', () => {
    const merged = mergeConfigOverride(base, { router: { transition: true } });
    // router replaced wholesale (shallow), access untouched (app default)
    expect(merged.router).toEqual({ transition: true });
    expect(merged.access).toEqual({ admin: ['*'] });
  });

  it('drops unknown keys from the patch', () => {
    const merged = mergeConfigOverride(base, { serverUrl: 'https://x' }) as Record<string, unknown>;
    expect(merged).not.toHaveProperty('serverUrl');
    expect(merged.router).toEqual({ notFoundRedirect: '/home' });
  });

  it('does not mutate the base', () => {
    const snapshot = JSON.parse(JSON.stringify(base));
    mergeConfigOverride(base, { router: { transition: true } });
    expect(base).toEqual(snapshot);
  });
});

describe('createConfigStore', () => {
  it('initial config equals base', () => {
    createRoot((dispose) => {
      const { config } = createConfigStore({ router: { notFoundRedirect: '/a' } });
      expect(config.router?.notFoundRedirect).toBe('/a');
      dispose();
    });
  });

  it('applyOverride re-merges reactively (second patch re-merges store)', () => {
    createRoot((dispose) => {
      const { config, applyOverride } = createConfigStore({ router: { notFoundRedirect: '/a' } });
      const seen: (string | undefined)[] = [];
      // createComputed runs synchronously on create + on each dependency change.
      createComputed(() => {
        seen.push(config.router?.notFoundRedirect);
      });

      applyOverride({ router: { notFoundRedirect: '/b' } });
      applyOverride({ router: { notFoundRedirect: '/c' } });

      expect(seen).toEqual(['/a', '/b', '/c']);
      dispose();
    });
  });

  it('unknown-only patch is a no-op (store unchanged, no re-trigger)', () => {
    createRoot((dispose) => {
      const { config, applyOverride } = createConfigStore({ router: { notFoundRedirect: '/a' } });
      const seen: (string | undefined)[] = [];
      createComputed(() => {
        seen.push(config.router?.notFoundRedirect);
      });

      applyOverride({ serverUrl: 'https://x', theme: 'dark' });

      expect(config.router?.notFoundRedirect).toBe('/a');
      expect(seen).toEqual(['/a']); // no extra computed run
      dispose();
    });
  });
});
