/**
 * rulesStore unit tests — loadRules (список) + openRule (кэш деталь+дриллы по id
 * с дедупом: `Rule`+`RuleDrills` = один fetch) + reset. Каскад координации
 * rule → drill: cache-miss `openRule` сбрасывает эфемерный дрилл (`drillsStore`),
 * cache-hit НЕ трогает (иначе второй блок затёр бы ввод первого).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drillsStore } from '../../drills/store';
import { rulesStore } from '../store';
import type { IRuleDetail, IRuleSummary } from '../types';

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

const mockFetch = (handlers: { rules?: IRuleSummary[]; rule?: IRuleDetail } = {}) => {
  const spy = vi.fn(async (url: string, init?: { method?: string }) => {
    if (init?.method === 'POST') {
      return { ok: true, json: async () => ({ verdict: 'correct' }) };
    }
    if (url.includes('/learn/rules/')) {
      return { ok: true, json: async () => handlers.rule ?? ruleDetail('x') };
    }
    return { ok: true, json: async () => ({ rules: handlers.rules ?? [] }) };
  });
  vi.stubGlobal('fetch', spy);
  return spy;
};

describe('web-learn rules store', () => {
  beforeEach(() => {
    rulesStore.reset();
    drillsStore.reset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadRules GETs /learn/rules and toggles rulesLoading', async () => {
    mockFetch({ rules: [ruleSummary('grammar-pronouns')] });
    const promise = rulesStore.loadRules('http://api');
    expect(rulesStore.rulesLoading()).toBe(true);
    await promise;

    expect(fetch).toHaveBeenCalledWith('http://api/learn/rules');
    expect(rulesStore.rules().map((r) => r.id)).toEqual(['grammar-pronouns']);
    expect(rulesStore.rulesLoading()).toBe(false);
  });

  it('openRule caches the rule with its drills by id', async () => {
    mockFetch({ rule: ruleDetail('grammar-pronouns') });
    await rulesStore.openRule('http://api', 'grammar-pronouns');

    expect(fetch).toHaveBeenCalledWith('http://api/learn/rules/grammar-pronouns');
    expect(rulesStore.rule('grammar-pronouns')?.drills.map((d) => d.id)).toEqual([
      'grammar-pronouns-drill',
    ]);
  });

  it('openRule dedupes — Rule + RuleDrills on one id → one fetch', async () => {
    const spy = mockFetch({ rule: ruleDetail('grammar-pronouns') });
    await Promise.all([
      rulesStore.openRule('http://api', 'grammar-pronouns'),
      rulesStore.openRule('http://api', 'grammar-pronouns'),
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('cache-miss openRule resets ephemeral drill state; cache-hit does not', async () => {
    mockFetch({ rule: ruleDetail('grammar-pronouns') });

    // first (cache-miss) load resets any stale interaction
    drillsStore.setAnswer('d1', 0, 'stale');
    await drillsStore.check('http://api', 'd1', 0);
    expect(drillsStore.verdict('d1', 0)).not.toBeNull();
    await rulesStore.openRule('http://api', 'grammar-pronouns');
    expect(drillsStore.answer('d1', 0)).toBe('');
    expect(drillsStore.verdict('d1', 0)).toBeNull();

    // now type into a rule drill, then a cache-HIT openRule must NOT wipe it
    // (else the second block would clobber the first block's input)
    drillsStore.setAnswer('grammar-pronouns-drill', 0, 'keep me');
    await rulesStore.openRule('http://api', 'grammar-pronouns');
    expect(drillsStore.answer('grammar-pronouns-drill', 0)).toBe('keep me');
  });
});
