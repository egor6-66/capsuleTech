/**
 * lessonsStore — concepts/rules навигация (Lessons ИА iter 1). Списки + деталь
 * обеих вкладок; правило несёт СВОИ дриллы, и `openRule` сбрасывает эфемерный
 * интерактив дрилла (тот же чекер, что урок). Плейн `createStore` — тот же
 * канон, что уроки/library (не зависит от `@xstate/solid`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lessonsStore } from '../store';
import type { IConcept, IConceptSummary, IRuleDetail, IRuleSummary } from '../types';

const conceptSummary = (id: string): IConceptSummary => ({
  id,
  title: id,
  principle: `${id}-principle`,
  tags: ['philosophy'],
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

const ruleSummary = (id: string): IRuleSummary => ({ id, title: id, tags: ['grammar'] });

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

  it('openConcept GETs the concept, sets selectedConceptId + currentConcept', async () => {
    mockFetch({ concept: conceptDetail('word-as-image') });
    await lessonsStore.openConcept('http://api', 'word-as-image');

    expect(fetch).toHaveBeenCalledWith('http://api/learn/concepts/word-as-image');
    expect(lessonsStore.selectedConceptId()).toBe('word-as-image');
    expect(lessonsStore.currentConcept()?.body).toBe('# word-as-image body');
  });

  it('close clears concept selection', async () => {
    mockFetch({ concept: conceptDetail('x') });
    await lessonsStore.openConcept('http://api', 'x');
    lessonsStore.close();

    expect(lessonsStore.selectedConceptId()).toBeNull();
    expect(lessonsStore.currentConcept()).toBeNull();
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

  it('openRule GETs the rule with its drills', async () => {
    mockFetch({ rule: ruleDetail('grammar-pronouns') });
    await lessonsStore.openRule('http://api', 'grammar-pronouns');

    expect(fetch).toHaveBeenCalledWith('http://api/learn/rules/grammar-pronouns');
    expect(lessonsStore.selectedRuleId()).toBe('grammar-pronouns');
    expect(lessonsStore.currentRule()?.drills.map((d) => d.id)).toEqual(['grammar-pronouns-drill']);
  });

  it('openRule resets ephemeral drill state (rule drills share the global checker)', async () => {
    mockFetch({ rule: ruleDetail('grammar-pronouns'), check: { verdict: 'correct' } });
    lessonsStore.setAnswer('d1', 0, 'stale');
    await lessonsStore.check('http://api', 'd1', 0);
    expect(lessonsStore.verdict('d1', 0)).not.toBeNull();

    await lessonsStore.openRule('http://api', 'grammar-pronouns');
    expect(lessonsStore.answer('d1', 0)).toBe('');
    expect(lessonsStore.verdict('d1', 0)).toBeNull();
  });
});
