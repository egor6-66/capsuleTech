/**
 * contract.test.ts
 *
 * Characterization tests for defineContract / validateEvent / Out|InEvents (ADR 060 Phase 1).
 *
 * Contracts:
 *  1. defineContract returns the contract as-is, with `z` injected.
 *  2. defineContract preserves precise schema generics (type-level: z.infer is exact, not `any`).
 *  3. validateEvent: valid payload → ok with parsed value.
 *  4. validateEvent: invalid payload → error carrying issue path + message.
 *  5. validateEvent: unknown event → error.
 *  6. validateEvent: respects the `in` / `out` direction.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineContract, type InEvents, type OutEvents, validateEvent } from '../contract';

const makeContract = () =>
  defineContract((z) => ({
    in: {
      setTheme: z.object({ theme: z.string() }),
    },
    out: {
      onLogin: z.object({ token: z.string(), expiresAt: z.number() }),
    },
  }));

describe('defineContract', () => {
  it('returns the built contract (z injected, passthrough)', () => {
    const contract = makeContract();
    expect(contract.in.setTheme).toBeDefined();
    expect(contract.out.onLogin).toBeDefined();
    // schemas are real zod schemas — they parse.
    expect(contract.out.onLogin.safeParse({ token: 'x', expiresAt: 1 }).success).toBe(true);
  });

  it('preserves precise schema generics (type-level z.infer)', () => {
    const contract = makeContract();
    type C = typeof contract;

    // If generics were erased to ZodTypeAny, these would be `any` and the assertions fail.
    expectTypeOf<OutEvents<C>>().toEqualTypeOf<{ onLogin: { token: string; expiresAt: number } }>();
    expectTypeOf<InEvents<C>>().toEqualTypeOf<{ setTheme: { theme: string } }>();
  });
});

describe('validateEvent', () => {
  it('returns ok with the parsed value for a valid payload', () => {
    const contract = makeContract();
    const res = validateEvent(contract, 'out', 'onLogin', { token: 'abc', expiresAt: 42 });
    expect(res).toEqual({ ok: true, value: { token: 'abc', expiresAt: 42 } });
  });

  it('returns an error carrying the issue path + message for an invalid payload', () => {
    const contract = makeContract();
    const res = validateEvent(contract, 'out', 'onLogin', { token: 123, expiresAt: 42 });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.error).toContain('token');
  });

  it('returns an error for an unknown event', () => {
    const contract = makeContract();
    const res = validateEvent(contract, 'out', 'doesNotExist', {});
    expect(res).toEqual({ ok: false, error: 'Unknown out event "doesNotExist"' });
  });

  it('respects the in/out direction (in-only event not found under out)', () => {
    const contract = makeContract();
    const okIn = validateEvent(contract, 'in', 'setTheme', { theme: 'dark' });
    expect(okIn.ok).toBe(true);

    const missUnderOut = validateEvent(contract, 'out', 'setTheme', { theme: 'dark' });
    expect(missUnderOut.ok).toBe(false);
  });
});
