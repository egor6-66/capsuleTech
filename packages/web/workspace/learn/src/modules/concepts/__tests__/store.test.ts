/**
 * conceptsStore unit tests — loadConcepts (список) + openConcept (кэш по id с
 * дедупом) + reset (чистит кэш, список сохраняется). URL-driven: стор держит
 * данные/кэш, не «selected»-стейт. Плейн `createStore` — не зависит от
 * `@xstate/solid`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { conceptsStore } from '../store';
import type { IConcept, IConceptSummary } from '../types';

const conceptSummary = (id: string): IConceptSummary => ({
  id,
  title: id,
  principle: `${id}-principle`,
  tags: ['philosophy'],
  kind: 'approach',
  sortOrder: 100,
});

const conceptDetail = (id: string): IConcept => ({
  id,
  title: id,
  principle: `${id}-principle`,
  body: `# ${id} body`,
  tags: ['philosophy'],
  examples: [{ en: 'I eat', ru: 'Я ем' }],
  relatedRules: [],
  relatedConcepts: [],
});

const mockFetch = (handlers: { concepts?: IConceptSummary[]; concept?: IConcept } = {}) => {
  const spy = vi.fn(async (url: string) => {
    if (url.includes('/learn/concepts/')) {
      return { ok: true, json: async () => handlers.concept ?? conceptDetail('x') };
    }
    return { ok: true, json: async () => ({ concepts: handlers.concepts ?? [] }) };
  });
  vi.stubGlobal('fetch', spy);
  return spy;
};

describe('web-learn concepts store', () => {
  beforeEach(() => {
    conceptsStore.reset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadConcepts GETs /learn/concepts and toggles conceptsLoading', async () => {
    mockFetch({ concepts: [conceptSummary('a'), conceptSummary('b')] });
    const promise = conceptsStore.loadConcepts('http://api');
    expect(conceptsStore.conceptsLoading()).toBe(true);
    await promise;

    expect(fetch).toHaveBeenCalledWith('http://api/learn/concepts');
    expect(conceptsStore.concepts().map((c) => c.id)).toEqual(['a', 'b']);
    expect(conceptsStore.conceptsLoading()).toBe(false);
  });

  it('openConcept caches the concept by id (concept(id) getter)', async () => {
    mockFetch({ concept: conceptDetail('word-as-image') });
    expect(conceptsStore.concept('word-as-image')).toBeNull();
    await conceptsStore.openConcept('http://api', 'word-as-image');

    expect(fetch).toHaveBeenCalledWith('http://api/learn/concepts/word-as-image');
    expect(conceptsStore.concept('word-as-image')?.body).toBe('# word-as-image body');
  });

  it('openConcept dedupes — second call on a cached id does not refetch', async () => {
    const spy = mockFetch({ concept: conceptDetail('word-as-image') });
    await conceptsStore.openConcept('http://api', 'word-as-image');
    await conceptsStore.openConcept('http://api', 'word-as-image');

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('reset clears the concept cache', async () => {
    mockFetch({ concept: conceptDetail('x') });
    await conceptsStore.openConcept('http://api', 'x');
    conceptsStore.reset();

    expect(conceptsStore.concept('x')).toBeNull();
  });
});
