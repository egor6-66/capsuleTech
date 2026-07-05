/**
 * core/refnav tests — async-устойчивый резолв wikilink/related ref (ADR 069).
 * Координатор знает ОБА стора (`conceptsStore`+`rulesStore`); `emitRefNav`:
 * промах по загруженным спискам → `ensureLists` догружает → повторный резолв →
 * emit; промах ПОСЛЕ догруза → warn + no-op; повторный резолв не рефетчит;
 * параллельные промахи — один in-flight на список.
 *
 * `lists` обнуляем детерминированно пустым `loadConcepts`/`loadRules` (reset их
 * НЕ чистит — канон «списки персистятся»).
 */
/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { conceptsStore } from '../../modules/concepts/store';
import { rulesStore } from '../../modules/rules/store';
import { emitRefNav } from '../refnav';

const emit = vi.fn();

let rulesList: string[] = [];
let conceptsList: string[] = [];
let rulesFetches = 0;
let conceptsFetches = 0;

const catOf = (id: string) => ({
  id,
  title: id,
  tags: [],
  category: 'grammar' as const,
  sortOrder: 100,
});
const kindOf = (id: string) => ({
  id,
  title: id,
  principle: '',
  tags: [],
  kind: 'approach' as const,
  sortOrder: 100,
});

const mockFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/learn/rules')) {
        rulesFetches++;
        return { ok: true, json: async () => ({ rules: rulesList.map(catOf) }) };
      }
      conceptsFetches++;
      return { ok: true, json: async () => ({ concepts: conceptsList.map(kindOf) }) };
    }),
  );

beforeEach(async () => {
  emit.mockClear();
  rulesList = [];
  conceptsList = [];
  conceptsStore.reset();
  rulesStore.reset();
  mockFetch();
  // Детерминированно обнулить списки сторов (reset их не чистит); loadRules/
  // loadConcepts безусловно перезаписывают → чистый старт каждого теста.
  await rulesStore.loadRules('');
  await conceptsStore.loadConcepts('');
  rulesFetches = 0;
  conceptsFetches = 0;
});

afterEach(() => {
  conceptsStore.reset();
  rulesStore.reset();
  vi.unstubAllGlobals();
});

describe('emitRefNav', () => {
  it('wikilink к правилу при ПУСТОМ rules-списке → догруз → onRuleSelect', async () => {
    rulesList = ['ref-rule'];

    await emitRefNav('ref-rule', '', 'Learn.Concept', emit);

    expect(rulesFetches).toBe(1); // список догружен по промаху
    expect(emit).toHaveBeenCalledWith('onRuleSelect', {
      source: 'Learn.Concept',
      payload: { id: 'ref-rule' },
    });
  });

  it('wikilink к концепту при ПУСТОМ concepts-списке → догруз → onConceptSelect', async () => {
    conceptsList = ['ref-concept'];

    await emitRefNav('ref-concept', '', 'Learn.Rule', emit);

    expect(conceptsFetches).toBe(1);
    expect(emit).toHaveBeenCalledWith('onConceptSelect', {
      source: 'Learn.Rule',
      payload: { id: 'ref-concept' },
    });
  });

  it('unknown ref после догруза → console.warn, emit не зовётся', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rulesList = ['other-rule'];
    conceptsList = ['other-concept'];

    await emitRefNav('nope', '', 'Learn.Rule', emit);

    expect(warn).toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('повторный резолв по загруженному списку не рефетчит (кэш)', async () => {
    rulesList = ['ref-rule'];

    await emitRefNav('ref-rule', '', 'Learn.Concept', emit);
    expect(rulesFetches).toBe(1);

    emit.mockClear();
    await emitRefNav('ref-rule', '', 'Learn.Concept', emit);

    expect(rulesFetches).toBe(1); // hit по уже загруженному — нового fetch нет
    expect(emit).toHaveBeenCalledWith('onRuleSelect', {
      source: 'Learn.Concept',
      payload: { id: 'ref-rule' },
    });
  });

  it('параллельные промахи → один догруз каждого списка (in-flight дедуп)', async () => {
    rulesList = ['r-a'];
    conceptsList = ['c-b'];

    await Promise.all([emitRefNav('r-a', '', 'S', emit), emitRefNav('c-b', '', 'S', emit)]);

    expect(rulesFetches).toBe(1);
    expect(conceptsFetches).toBe(1);
    expect(emit).toHaveBeenCalledWith('onRuleSelect', { source: 'S', payload: { id: 'r-a' } });
    expect(emit).toHaveBeenCalledWith('onConceptSelect', { source: 'S', payload: { id: 'c-b' } });
  });
});
