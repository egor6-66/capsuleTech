/**
 * Learn.Lessons.Rules tests (iter 2) — аккордеон по `category`: порядок групп +
 * ru-подписи + подзаголовки; СВЁРНУТ по умолчанию, кроме группы активного `id`
 * (проверяем через `aria-expanded` триггеров — стабильный сигнал Kobalte);
 * внутри — по `sortOrder`; клик по карточке → emit `onRuleSelect { id }`.
 * `useEmitOptional` мокнут (прецедент `List`).
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Rules } from '../Rules';
import { lessonsStore } from '../store';
import type { IRuleSummary, RuleCategory } from '../types';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

const summary = (id: string, category: RuleCategory, sortOrder: number): IRuleSummary => ({
  id,
  title: id,
  tags: ['grammar'],
  category,
  sortOrder,
});

// grammar group out of order (b before a) to prove within-group sort by sortOrder.
const RULES = [
  summary('phon-x', 'phonetics', 10),
  summary('gram-b', 'grammar', 20),
  summary('gram-a', 'grammar', 10),
  summary('speech-x', 'speech', 10),
];

const mockFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ rules: RULES }) })),
  );

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  emitSpy.mockClear();
  lessonsStore.close();
  mockFetch();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
  vi.unstubAllGlobals();
});

const flush = () => new Promise((r) => setTimeout(r, 0));
const cards = () => [...container.querySelectorAll('[role="button"]')];
const triggers = () => [...container.querySelectorAll('[aria-expanded]')];
const triggerFor = (label: string) => triggers().find((t) => t.textContent?.includes(label));
const orderOf = (...needles: string[]) =>
  needles.map((n) => (container.textContent ?? '').indexOf(n));

describe('Learn.Lessons.Rules', () => {
  it('lazy-loads on mount', async () => {
    cleanup = render(() => <Rules />, container);
    await flush();
    expect(fetch).toHaveBeenCalledWith('/learn/rules');
  });

  it('renders groups in canonical order with ru labels + subtitles', async () => {
    await lessonsStore.loadRules('');
    cleanup = render(() => <Rules />, container);
    await flush();

    const [phon, gram, speech] = orderOf('Фонетика', 'Грамматика', 'Речь');
    expect(phon).toBeGreaterThanOrEqual(0);
    expect(phon).toBeLessThan(gram);
    expect(gram).toBeLessThan(speech);
    expect(container.textContent).toContain('Строй фразы: времена, порядок, связки.');
  });

  it('collapsed by default except the active id group', async () => {
    await lessonsStore.loadRules('');
    cleanup = render(() => <Rules id="gram-a" />, container);
    await flush();

    // active rule's group (grammar) is expanded; the others stay collapsed
    expect(triggerFor('Грамматика')?.getAttribute('aria-expanded')).toBe('true');
    expect(triggerFor('Фонетика')?.getAttribute('aria-expanded')).toBe('false');
    expect(triggerFor('Речь')?.getAttribute('aria-expanded')).toBe('false');

    // expanded group's items sorted by sortOrder: gram-a (10) before gram-b (20)
    const [a, b] = orderOf('gram-a', 'gram-b');
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(b);
  });

  it('click on a rule card emits onRuleSelect', async () => {
    await lessonsStore.loadRules('');
    cleanup = render(() => <Rules id="gram-a" />, container);
    await flush();

    const card = cards().find((c) => c.textContent?.trim() === 'gram-a');
    (card as HTMLElement).click();

    expect(emitSpy).toHaveBeenCalledWith('onRuleSelect', {
      source: 'Learn.Lessons.Rules',
      payload: { id: 'gram-a' },
    });
  });
});
