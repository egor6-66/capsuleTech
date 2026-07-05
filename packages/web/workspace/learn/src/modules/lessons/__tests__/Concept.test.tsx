/**
 * Learn.Lessons.Concept tests (iter 2) — URL-driven по `id`: title (свой) +
 * принцип + тело в `Prose` (ведущий H1 срезан) + примеры + чипы relatedRules
 * («Смотри правила») → emit `onRuleSelect`; wikilink → `onConceptSelect`.
 * Fallback до выбора. `useEmitOptional`/`renderMarkdown` мокнуты.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Concept } from '../Concept';
import { lessonsStore } from '../store';
import type { IConcept } from '../types';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

vi.mock('@capsuletech/web-docs', () => ({
  renderMarkdown: (md: string) => md, // echo — тело кладём как готовый HTML
}));

const conceptWith = (over: Partial<IConcept> = {}): IConcept => ({
  id: 'word-as-image',
  title: 'CONCEPT-TITLE',
  principle: 'CONCEPT-PRINCIPLE',
  body: 'CONCEPT-BODY',
  tags: [],
  examples: [{ en: 'I eat', ru: 'Я ем' }],
  relatedRules: [],
  relatedConcepts: [],
  ...over,
});

let concept: IConcept = conceptWith();
let rulesList: { id: string; title: string }[] = [];
let conceptsList: string[] = [];

const catOf = (r: { id: string; title: string }) => ({
  ...r,
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
      if (url.includes('/learn/concepts/')) return { ok: true, json: async () => concept };
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
  concept = conceptWith();
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
const cards = () => [...container.querySelectorAll('[role="button"]')];

describe('Learn.Lessons.Concept', () => {
  it('renders title, principle, body (strip leading H1) and examples', async () => {
    concept = conceptWith({ body: '# DUP-HEADING\nCONCEPT-BODY-PROSE' });
    await lessonsStore.openConcept('', 'word-as-image');
    cleanup = render(() => <Concept id="word-as-image" />, container);
    await flush();

    const text = container.textContent ?? '';
    expect(text).toContain('CONCEPT-TITLE');
    expect(text).toContain('CONCEPT-PRINCIPLE');
    expect(text).toContain('CONCEPT-BODY-PROSE');
    expect(text).toContain('I eat');
    expect(text).not.toContain('DUP-HEADING'); // leading H1 stripped
    expect(container.querySelector('[class*="text-foreground"]')).toBeTruthy(); // Prose
  });

  it('relatedRules chip → onRuleSelect (label = rule title when loaded)', async () => {
    concept = conceptWith({ relatedRules: ['grammar-x'] });
    rulesList = [{ id: 'grammar-x', title: 'Grammar X' }];
    await lessonsStore.loadRules('');
    await lessonsStore.openConcept('', 'word-as-image');
    cleanup = render(() => <Concept id="word-as-image" />, container);
    await flush();

    expect(container.textContent).toContain('Смотри правила');
    const chip = cards().find((c) => c.textContent?.includes('Grammar X'));
    (chip as HTMLElement).click();

    expect(emitSpy).toHaveBeenCalledWith('onRuleSelect', {
      source: 'Learn.Lessons.Concept',
      payload: { id: 'grammar-x' },
    });
  });

  it('wikilink → onConceptSelect when ref is a loaded concept', async () => {
    concept = conceptWith({ body: '<a class="wikilink" data-ref="ref-c">go</a>' });
    conceptsList = ['ref-c'];
    await lessonsStore.loadConcepts('');
    await lessonsStore.openConcept('', 'word-as-image');
    cleanup = render(() => <Concept id="word-as-image" />, container);
    await flush();

    (container.querySelector('a.wikilink') as HTMLElement).click();

    expect(emitSpy).toHaveBeenCalledWith('onConceptSelect', {
      source: 'Learn.Lessons.Concept',
      payload: { id: 'ref-c' },
    });
  });

  it('fallback when no concept id is set', () => {
    cleanup = render(() => <Concept />, container);
    expect(container.textContent).toContain('Выберите концепт');
  });
});
