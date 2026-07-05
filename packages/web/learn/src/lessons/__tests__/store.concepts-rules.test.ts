/**
 * lessonsStore — concepts/rules навигация (Lessons ИА iter 2, URL-driven).
 * Списки + **кэш деталей по id** (стор больше не держит «selected»-стейт). Ключ
 * iter-2: `open{Concept,Rule}` ДЕДУПЛИЦИРОВАНЫ — повторный вызов на
 * закэшированный/загружающийся id даёт 0 новых fetch (так `Rule` и `RuleDrills`
 * на один id = один fetch правила). cache-miss `openRule` сбрасывает эфемерный
 * интерактив дрилла, cache-hit — НЕТ. Плейн `createStore` — тот же канон, что
 * уроки/library (не зависит от `@xstate/solid`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lessonsStore } from '../store';
import type { IConcept, IConceptSummary, IRuleDetail, IRuleSummary } from '../types';

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

const ruleSummary = (id: string): IRuleSummary => ({
  id,
  title: id,
  tags: ['grammar'],
  category: 'grammar',
  sortOrder: 100,
});

const ruleDetail = (id: string): IRuleDetail => ({
  id,
  title: id,
  body: `# ${id} rule body`,
  tags: ['grammar'],
  drills: [
    {
      id: `${id}-drill`,
      title: 'Drill',
      level: 'l2',
      tags: [],
      rule: id,
      graboTag: `${id}-drill`,
      words: [],
      concepts: [],
      items: [{ index: 0, promptRu: 'Я вижу его.', context: null }],
      words_resolved: [],
    },
  ],
});

/** URL-диспетчер fetch: concepts list/detail, rules list/detail, check POST. */
const mockFetch = (
  handlers: {
    concepts?: IConceptSummary[];
    concept?: IConcept;
    rules?: IRuleSummary[];
    rule?: IRuleDetail;
    check?: { verdict: string };
  } = {},
) => {
  const spy = vi.fn(async (url: string, init?: { method?: string }) => {
    if (init?.method === 'POST') {
      return { ok: true, json: async () => handlers.check ?? { verdict: 'wrong' } };
    }
    if (url.includes('/learn/concepts/')) {
      return { ok: true, json: async () => handlers.concept ?? conceptDetail('x') };
    }
    if (url.includes('/learn/rules/')) {
      return { ok: true, json: async () => handlers.rule ?? ruleDetail('x') };
    }
    if (url.includes('/learn/rules')) {
      return { ok: true, json: async () => ({ rules: handlers.rules ?? [] }) };
    }
    return { ok: true, json: async () => ({ concepts: handlers.concepts ?? [] }) };
  });
  vi.stubGlobal('fetch', spy);
  return spy;
};

describe('web-learn lessons store — concepts', () => {
  beforeEach(() => {
    lessonsStore.close();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadConcepts GETs /learn/concepts and toggles conceptsLoading', async () => {
    mockFetch({ concepts: [conceptSummary('a'), conceptSummary('b')] });
    const promise = lessonsStore.loadConcepts('http://api');
    expect(lessonsStore.conceptsLoading()).toBe(true);
    await promise;

    expect(fetch).toHaveBeenCalledWith('http://api/learn/concepts');
    expect(lessonsStore.concepts().map((c) => c.id)).toEqual(['a', 'b']);
    expect(lessonsStore.conceptsLoading()).toBe(false);
  });

  it('openConcept caches the concept by id (concept(id) getter)', async () => {
    mockFetch({ concept: conceptDetail('word-as-image') });
    expect(lessonsStore.concept('word-as-image')).toBeNull();
    await lessonsStore.openConcept('http://api', 'word-as-image');

    expect(fetch).toHaveBeenCalledWith('http://api/learn/concepts/word-as-image');
    expect(lessonsStore.concept('word-as-image')?.body).toBe('# word-as-image body');
  });

  it('openConcept dedupes — second call on a cached id does not refetch', async () => {
    const spy = mockFetch({ concept: conceptDetail('word-as-image') });
    await lessonsStore.openConcept('http://api', 'word-as-image');
    await lessonsStore.openConcept('http://api', 'word-as-image');

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('close clears the concept cache', async () => {
    mockFetch({ concept: conceptDetail('x') });
    await lessonsStore.openConcept('http://api', 'x');
    lessonsStore.close();

    expect(lessonsStore.concept('x')).toBeNull();
  });
});

describe('web-learn lessons store — rules', () => {
  beforeEach(() => {
    lessonsStore.close();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadRules GETs /learn/rules and toggles rulesLoading', async () => {
    mockFetch({ rules: [ruleSummary('grammar-pronouns')] });
    const promise = lessonsStore.loadRules('http://api');
    expect(lessonsStore.rulesLoading()).toBe(true);
    await promise;

    expect(fetch).toHaveBeenCalledWith('http://api/learn/rules');
    expect(lessonsStore.rules().map((r) => r.id)).toEqual(['grammar-pronouns']);
    expect(lessonsStore.rulesLoading()).toBe(false);
  });

  it('openRule caches the rule with its drills by id', async () => {
    mockFetch({ rule: ruleDetail('grammar-pronouns') });
    await lessonsStore.openRule('http://api', 'grammar-pronouns');

    expect(fetch).toHaveBeenCalledWith('http://api/learn/rules/grammar-pronouns');
    expect(lessonsStore.rule('grammar-pronouns')?.drills.map((d) => d.id)).toEqual([
      'grammar-pronouns-drill',
    ]);
  });

  it('openRule dedupes — Rule + RuleDrills on one id → one fetch', async () => {
    const spy = mockFetch({ rule: ruleDetail('grammar-pronouns') });
    // simulate both blocks opening the same rule concurrently
    await Promise.all([
      lessonsStore.openRule('http://api', 'grammar-pronouns'),
      lessonsStore.openRule('http://api', 'grammar-pronouns'),
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('cache-miss openRule resets ephemeral drill state; cache-hit does not', async () => {
    mockFetch({ rule: ruleDetail('grammar-pronouns'), check: { verdict: 'correct' } });

    // first (cache-miss) load resets any stale interaction
    lessonsStore.setAnswer('d1', 0, 'stale');
    await lessonsStore.check('http://api', 'd1', 0);
    expect(lessonsStore.verdict('d1', 0)).not.toBeNull();
    await lessonsStore.openRule('http://api', 'grammar-pronouns');
    expect(lessonsStore.answer('d1', 0)).toBe('');
    expect(lessonsStore.verdict('d1', 0)).toBeNull();

    // now type into a rule drill, then a cache-HIT openRule must NOT wipe it
    // (else the second block would clobber the first block's input)
    lessonsStore.setAnswer('grammar-pronouns-drill', 0, 'keep me');
    await lessonsStore.openRule('http://api', 'grammar-pronouns');
    expect(lessonsStore.answer('grammar-pronouns-drill', 0)).toBe('keep me');
  });
});
