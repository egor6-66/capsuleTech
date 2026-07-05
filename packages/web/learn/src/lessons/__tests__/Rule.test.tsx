/**
 * Learn.Lessons.Rule tests (iter 2) — URL-driven по `id`-пропу: title (свой) +
 * тело в `Prose` со СРЕЗАННЫМ ведущим H1; БЕЗ дриллов (уехали в `RuleDrills`);
 * wikilink в теле → emit `onRuleSelect`/`onConceptSelect` (по загруженным
 * спискам), неизвестный ref → `console.warn` + no-op. Fallback до выбора.
 *
 * `renderMarkdown` мокнут ИДЕНТИЧНО (echo) — тело = сырой HTML, чтобы положить в
 * него настоящий `<a class="wikilink" data-ref>` и кликнуть. `useEmitOptional`
 * мокнут (прецедент `View`).
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Rule } from '../Rule';
import { lessonsStore } from '../store';
import type { IRuleDetail } from '../types';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

vi.mock('@capsuletech/web-docs', () => ({
  renderMarkdown: (md: string) => md, // echo — тело кладём как готовый HTML
}));

const ruleWith = (id: string, body: string): IRuleDetail => ({
  id,
  title: 'RULE-TITLE',
  body,
  tags: ['grammar'],
  drills: [],
});

let ruleBody = 'RULE-BODY';
let rulesList: string[] = [];
let conceptsList: string[] = [];

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
      if (url.includes('/learn/rules/'))
        return { ok: true, json: async () => ruleWith('r1', ruleBody) };
      if (url.includes('/learn/rules'))
        return { ok: true, json: async () => ({ rules: rulesList.map(catOf) }) };
      return { ok: true, json: async () => ({ concepts: conceptsList.map(kindOf) }) };
    }),
  );

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  emitSpy.mockClear();
  ruleBody = 'RULE-BODY';
  rulesList = [];
  conceptsList = [];
  lessonsStore.close();
  mockFetch();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
  lessonsStore.close();
  vi.unstubAllGlobals();
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('Learn.Lessons.Rule', () => {
  it('renders title + body in Prose, strips the leading H1, no drills', async () => {
    ruleBody = '# DUP-HEADING\nRULE-BODY-PROSE';
    await lessonsStore.openRule('', 'r1');
    cleanup = render(() => <Rule id="r1" />, container);
    await flush();

    const text = container.textContent ?? '';
    expect(text).toContain('RULE-TITLE'); // block-rendered title
    expect(text).toContain('RULE-BODY-PROSE'); // body
    expect(text).not.toContain('DUP-HEADING'); // leading H1 stripped
    expect(text).not.toContain('Практика'); // drills live in RuleDrills now

    // body wrapped in Prose (tokenized foreground), not a raw div
    expect(container.querySelector('[class*="text-foreground"]')).toBeTruthy();
  });

  it('fallback when no rule id is set', async () => {
    cleanup = render(() => <Rule />, container);
    expect(container.textContent).toContain('Выберите правило');
  });

  it('wikilink → onRuleSelect when ref is a loaded rule', async () => {
    ruleBody = '<a class="wikilink" data-ref="ref-rule">go</a>';
    rulesList = ['ref-rule'];
    await lessonsStore.loadRules('');
    await lessonsStore.openRule('', 'r1');
    cleanup = render(() => <Rule id="r1" />, container);
    await flush();

    (container.querySelector('a.wikilink') as HTMLElement).click();

    expect(emitSpy).toHaveBeenCalledWith('onRuleSelect', {
      source: 'Learn.Lessons.Rule',
      payload: { id: 'ref-rule' },
    });
  });

  it('wikilink → onConceptSelect when ref is a loaded concept', async () => {
    ruleBody = '<a class="wikilink" data-ref="ref-concept">go</a>';
    conceptsList = ['ref-concept'];
    await lessonsStore.loadConcepts('');
    await lessonsStore.openRule('', 'r1');
    cleanup = render(() => <Rule id="r1" />, container);
    await flush();

    (container.querySelector('a.wikilink') as HTMLElement).click();

    expect(emitSpy).toHaveBeenCalledWith('onConceptSelect', {
      source: 'Learn.Lessons.Rule',
      payload: { id: 'ref-concept' },
    });
  });

  it('unknown wikilink ref → console.warn, no emit (after lazy list load)', async () => {
    ruleBody = '<a class="wikilink" data-ref="nope">go</a>';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await lessonsStore.openRule('', 'r1');
    cleanup = render(() => <Rule id="r1" />, container);
    await flush();

    (container.querySelector('a.wikilink') as HTMLElement).click();
    await flush(); // miss → ensureLists догруз → повторный резолв → warn (async)

    expect(warn).toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
