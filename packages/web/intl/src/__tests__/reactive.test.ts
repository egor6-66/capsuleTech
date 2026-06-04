import { createComputed, createRoot } from 'solid-js';
import { beforeEach, describe, expect, it } from 'vitest';
import { setDefaultLocale, setLocale, setTenant, useLocales } from '../locale';
import { __resetRegistry, registerCopy } from '../registry';
import { resolveCopy } from '../resolve';

beforeEach(() => {
  __resetRegistry();
  setLocale('');
  setTenant(null);
  setDefaultLocale('');
});

// `createComputed` runs synchronously on creation and re-runs synchronously
// when a tracked dependency changes — lets us assert reactivity without a
// scheduler flush (unlike the queued `createEffect`).

describe('reactivity', () => {
  it('re-runs when the active locale changes', () => {
    registerCopy('en', { greeting: 'Hello' });
    registerCopy('ru', { greeting: 'Привет' });
    setLocale('en');

    const seen: string[] = [];
    createRoot((dispose) => {
      createComputed(() => seen.push(resolveCopy('greeting')));
      setLocale('ru');
      dispose();
    });

    expect(seen).toEqual(['Hello', 'Привет']);
  });

  it('re-runs when a dictionary is registered late', () => {
    setLocale('en');

    const seen: string[] = [];
    createRoot((dispose) => {
      createComputed(() => seen.push(resolveCopy('greeting')));
      registerCopy('en', { greeting: 'Hello' });
      dispose();
    });

    expect(seen).toEqual(['greeting', 'Hello']);
  });

  it('exposes registered locales reactively', () => {
    const seen: string[][] = [];
    createRoot((dispose) => {
      const locales = useLocales();
      createComputed(() => seen.push(locales()));
      registerCopy('en', { a: '1' });
      registerCopy('ru', { a: '1' });
      dispose();
    });

    expect(seen.at(-1)).toEqual(['en', 'ru']);
  });
});
