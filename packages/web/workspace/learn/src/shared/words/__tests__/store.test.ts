/**
 * wordsStore unit tests — load/select/selected, plus the regression guard
 * for the historical app-layer bug (`@xstate/solid` reconcile corruption,
 * brief `core-xstate-solid-reconcile-corruption.md`): re-selecting a
 * different id must resolve `selected()` to the NEW sense, not linger on the
 * old one. Plain `createStore` (this module) doesn't touch that bridge —
 * this test is the guard that it stays that way.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wordsStore } from '../store';
import type { ISense } from '../types';

const sense = (id: number, text: string): ISense => ({
  id,
  text,
  gloss: null,
  ru: null,
  pos: 'noun',
  level: null,
  register: null,
  frequency: null,
  pron_ru: null,
  connotation: null,
  synset: null,
  tags: [],
  audio: null,
});

const mockSenses = (senses: ISense[]) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ senses }) })),
  );
};

describe('web-learn words store', () => {
  beforeEach(() => {
    wordsStore.select(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('load(apiBase) GETs senses without a query param', async () => {
    mockSenses([sense(1, 'cat')]);
    await wordsStore.load('http://api');

    expect(fetch).toHaveBeenCalledWith('http://api/learn/lang/senses');
    expect(wordsStore.senses()).toEqual([sense(1, 'cat')]);
    expect(wordsStore.query()).toBe('');
  });

  it('load(apiBase, q) appends an encoded query param', async () => {
    mockSenses([]);
    await wordsStore.load('http://api', 'foo bar');

    expect(fetch).toHaveBeenCalledWith('http://api/learn/lang/senses?q=foo%20bar');
    expect(wordsStore.query()).toBe('foo bar');
  });

  it('toggles loading around the fetch', async () => {
    mockSenses([]);
    const promise = wordsStore.load('http://api');
    expect(wordsStore.loading()).toBe(true);
    await promise;
    expect(wordsStore.loading()).toBe(false);
  });

  it('selected() is null when nothing is selected', () => {
    expect(wordsStore.selected()).toBeNull();
  });

  it('select() + selected() resolve by id, and migrate on re-select (regression)', async () => {
    mockSenses([sense(1, 'cat'), sense(2, 'dog')]);
    await wordsStore.load('http://api');

    wordsStore.select(1);
    expect(wordsStore.selectedId()).toBe(1);
    expect(wordsStore.selected()).toEqual(sense(1, 'cat'));

    wordsStore.select(2);
    expect(wordsStore.selectedId()).toBe(2);
    expect(wordsStore.selected()).toEqual(sense(2, 'dog'));
  });
});
