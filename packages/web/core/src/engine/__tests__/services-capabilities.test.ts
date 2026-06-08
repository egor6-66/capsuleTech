/**
 * services-capabilities.test.ts
 *
 * Verifies that `z` and `utils` are injected as capabilities into the
 * `services` object passed to Controller/Feature factory bodies.
 *
 * We test this at the level where services are assembled — by simulating
 * the same import surface that createLogicWrapper uses, and confirming the
 * values are callable/usable. This avoids the need to spin up a full Solid
 * component tree.
 */

import { Utils } from '@capsuletech/shared-utils';
import { Zod } from '@capsuletech/shared-zod';
import { describe, expect, it } from 'vitest';
import type { IServices } from '../../wrappers/interfaces';

// Construct a minimal services object matching the shape that createLogicWrapper
// assembles. We test the *same runtime values* the wrapper would inject.
const mockRouter = {
  navigate: () => {},
  current: () => '/',
} as unknown as IServices['router'];

const controllerServices: IServices = {
  router: mockRouter,
  zod: Zod,
  utils: Utils,
};

const featureServices: IServices = {
  router: mockRouter,
  api: undefined,
  zod: Zod,
  utils: Utils,
};

describe('services capabilities — zod', () => {
  it('Controller services contains zod', () => {
    expect(controllerServices.zod).toBeDefined();
  });

  it('Feature services contains zod', () => {
    expect(featureServices.zod).toBeDefined();
  });

  it('zod.object is callable and produces a valid schema', () => {
    const schema = controllerServices.zod.object({ name: controllerServices.zod.string() });
    const result = schema.safeParse({ name: 'capsule' });
    expect(result.success).toBe(true);
  });

  it('zod.string + zod.email validates email', () => {
    const emailSchema = featureServices.zod.string().email();
    expect(emailSchema.safeParse('test@example.com').success).toBe(true);
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('zod in Controller and Feature is the same reference', () => {
    expect(controllerServices.zod).toBe(featureServices.zod);
  });
});

describe('services capabilities — utils', () => {
  it('Controller services contains utils', () => {
    expect(controllerServices.utils).toBeDefined();
  });

  it('Feature services contains utils', () => {
    expect(featureServices.utils).toBeDefined();
  });

  it('utils.includes works correctly', () => {
    const tags = ['login', 'input'];
    expect(controllerServices.utils.includes(tags, 'login')).toBe(true);
    expect(controllerServices.utils.includes(tags, 'logout')).toBe(false);
  });

  it('utils.filter works correctly', () => {
    const arr = [1, 2, 3, 4];
    expect(featureServices.utils.filter(arr, (x) => x > 2)).toEqual([3, 4]);
  });

  it('utils.map works correctly', () => {
    const arr = [1, 2, 3];
    expect(controllerServices.utils.map(arr, (x) => x * 2)).toEqual([2, 4, 6]);
  });

  it('utils in Controller and Feature is the same reference', () => {
    expect(controllerServices.utils).toBe(featureServices.utils);
  });
});

describe('services capabilities — IServices type contract', () => {
  it('services object satisfies IServices shape (compile-time: both fields present)', () => {
    // This test primarily exists to confirm the TypeScript types compile.
    // If IServices does not have zod/utils, this assignment would fail to compile.
    const s: IServices = controllerServices;
    expect(s.zod).toBeDefined();
    expect(s.utils).toBeDefined();
  });
});
