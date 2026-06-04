import { describe, expect, it } from 'vitest';
import { flatten } from '../flatten';

describe('flatten', () => {
  it('flattens a nested tree into dotted keys', () => {
    expect(flatten({ login: { title: 'Sign in', email: { label: 'Email' } } })).toEqual({
      'login.title': 'Sign in',
      'login.email.label': 'Email',
    });
  });

  it('keeps already-flat string leaves untouched', () => {
    expect(flatten({ greeting: 'Hello' })).toEqual({ greeting: 'Hello' });
  });

  it('handles mixed depth in one tree', () => {
    expect(
      flatten({
        cta: 'Continue',
        login: { submit: 'Sign in' },
      }),
    ).toEqual({
      cta: 'Continue',
      'login.submit': 'Sign in',
    });
  });

  it('returns an empty object for an empty tree', () => {
    expect(flatten({})).toEqual({});
  });
});
