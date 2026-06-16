/**
 * access-resolver.test.ts
 *
 * Unit-tests for the generic capability enforcement seam.
 *
 * Covers:
 *  - No resolver registered → resolveAccess always returns true.
 *  - Resolver registered → resolveAccess delegates to it.
 *  - resolver(cap) === false → resolveAccess returns false.
 *  - Passing null clears the resolver → back to allow-all.
 *  - hasAccessResolver() tracks registration state.
 *  - Resolver is called on every resolveAccess invocation (reactivity transparency:
 *    web-core must NOT memoize the result — it relies on the caller's reactive scope).
 *  - undefined / empty cap string → always allowed regardless of resolver.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasAccessResolver, registerAccessResolver, resolveAccess } from '../access-resolver';

/** Helper: reset resolver slot between tests by passing null. */
const clearResolver = () => registerAccessResolver(null);

describe('access-resolver — no resolver registered', () => {
  beforeEach(clearResolver);
  afterEach(clearResolver);

  it('resolveAccess returns true for any cap when no resolver is set', () => {
    expect(resolveAccess('builds')).toBe(true);
    expect(resolveAccess('workspace.builds')).toBe(true);
    expect(resolveAccess('billing.refund')).toBe(true);
  });

  it('resolveAccess returns true for undefined cap', () => {
    expect(resolveAccess(undefined)).toBe(true);
  });

  it('resolveAccess returns true for empty string', () => {
    expect(resolveAccess('')).toBe(true);
  });

  it('hasAccessResolver returns false when no resolver is set', () => {
    expect(hasAccessResolver()).toBe(false);
  });
});

describe('access-resolver — resolver registered', () => {
  beforeEach(clearResolver);
  afterEach(clearResolver);

  it('hasAccessResolver returns true after registration', () => {
    registerAccessResolver(() => true);
    expect(hasAccessResolver()).toBe(true);
  });

  it('resolveAccess delegates to resolver and returns true when granted', () => {
    registerAccessResolver(() => true);
    expect(resolveAccess('builds')).toBe(true);
  });

  it('resolveAccess delegates to resolver and returns false when denied', () => {
    registerAccessResolver(() => false);
    expect(resolveAccess('builds')).toBe(false);
  });

  it('resolver receives the capability string', () => {
    const resolver = vi.fn().mockReturnValue(true);
    registerAccessResolver(resolver);

    resolveAccess('workspace.builds');
    expect(resolver).toHaveBeenCalledWith('workspace.builds');
  });

  it('resolver is called on every resolveAccess invocation (no memoization)', () => {
    const resolver = vi.fn().mockReturnValue(true);
    registerAccessResolver(resolver);

    resolveAccess('builds');
    resolveAccess('builds');
    resolveAccess('builds');

    expect(resolver).toHaveBeenCalledTimes(3);
  });

  it('resolver returning false → resolveAccess returns false for that cap', () => {
    // Simulates role-based policy: 'admin' grants everything, 'viewer' grants nothing
    const allowedCaps = new Set(['builds', 'routing']);
    registerAccessResolver((cap) => allowedCaps.has(cap));

    expect(resolveAccess('builds')).toBe(true);
    expect(resolveAccess('routing')).toBe(true);
    expect(resolveAccess('billing.refund')).toBe(false);
  });
});

describe('access-resolver — clear resolver', () => {
  beforeEach(clearResolver);
  afterEach(clearResolver);

  it('passing null to registerAccessResolver clears the resolver', () => {
    registerAccessResolver(() => false);
    expect(hasAccessResolver()).toBe(true);

    registerAccessResolver(null);
    expect(hasAccessResolver()).toBe(false);
  });

  it('resolveAccess returns true again after resolver is cleared', () => {
    registerAccessResolver(() => false);
    expect(resolveAccess('builds')).toBe(false);

    registerAccessResolver(null);
    expect(resolveAccess('builds')).toBe(true);
  });
});

describe('access-resolver — undefined / empty cap short-circuit', () => {
  beforeEach(clearResolver);
  afterEach(clearResolver);

  it('undefined cap → always true even with a denying resolver', () => {
    registerAccessResolver(() => false);
    expect(resolveAccess(undefined)).toBe(true);
  });

  it('empty string cap → always true even with a denying resolver', () => {
    registerAccessResolver(() => false);
    expect(resolveAccess('')).toBe(true);
  });
});
