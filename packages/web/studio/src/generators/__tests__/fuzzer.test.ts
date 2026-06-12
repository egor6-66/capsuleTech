import { z } from '@capsuletech/shared-zod';
import { describe, expect, it } from 'vitest';
import { fuzzProps } from '../fuzzer';
import { createRng } from '../rng';

describe('fuzzer / fuzzProps', () => {
  it('returns defaults when schema is non-object', () => {
    const rng = createRng(1);
    const result = fuzzProps(rng, z.string(), { foo: 'bar' });
    expect(result).toEqual({ foo: 'bar' });
  });

  it('z.enum is picked from values', () => {
    const schema = z.object({
      variant: z.enum(['a', 'b', 'c']),
    });
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      const out = fuzzProps(rng, schema, {});
      expect(['a', 'b', 'c']).toContain(out.variant);
    }
  });

  it('z.boolean produces both true and false over many iters', () => {
    const schema = z.object({ enabled: z.boolean() });
    const rng = createRng(7);
    const seen = new Set<unknown>();
    for (let i = 0; i < 200; i++) {
      seen.add(fuzzProps(rng, schema, {}).enabled);
    }
    expect(seen).toEqual(new Set([true, false]));
  });

  it('z.number produces ints in [0, 100]', () => {
    const schema = z.object({ count: z.number() });
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = fuzzProps(rng, schema, {}).count;
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('z.string falls back to manifest default', () => {
    const schema = z.object({ children: z.string() });
    const rng = createRng(7);
    const out = fuzzProps(rng, schema, { children: 'Hello' });
    expect(out.children).toBe('Hello');
  });

  it('z.string().default() uses schema default', () => {
    const schema = z.object({ children: z.string().default('World') });
    const rng = createRng(7);
    const out = fuzzProps(rng, schema, {});
    expect(out.children).toBe('World');
  });

  it('z.optional sometimes returns undefined, sometimes value', () => {
    const schema = z.object({ class: z.string().optional() });
    const rng = createRng(7);
    let undefinedCount = 0;
    let definedCount = 0;
    for (let i = 0; i < 200; i++) {
      const out = fuzzProps(rng, schema, {});
      if (out.class === undefined) undefinedCount++;
      else definedCount++;
    }
    expect(undefinedCount).toBeGreaterThan(50);
    expect(definedCount).toBeGreaterThan(50);
  });

  it('overrides win over fuzz', () => {
    const schema = z.object({
      variant: z.enum(['a', 'b']),
      count: z.number(),
    });
    const rng = createRng(7);
    const out = fuzzProps(rng, schema, {}, { variant: 'fixed', count: 999 });
    expect(out.variant).toBe('fixed');
    expect(out.count).toBe(999);
  });

  it('keeps default for fields not in schema (extra keys in defaults)', () => {
    const schema = z.object({ variant: z.enum(['a']) });
    const rng = createRng(7);
    const out = fuzzProps(rng, schema, { variant: 'x', extraField: 'keep' });
    expect(out.extraField).toBe('keep');
  });

  it('is deterministic across runs with same seed', () => {
    const schema = z.object({
      variant: z.enum(['a', 'b', 'c']),
      enabled: z.boolean(),
      count: z.number(),
    });
    const a = fuzzProps(createRng(42), schema, {});
    const b = fuzzProps(createRng(42), schema, {});
    expect(a).toEqual(b);
  });
});
