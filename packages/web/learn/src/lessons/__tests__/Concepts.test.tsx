/**
 * Learn.Lessons.Concepts tests (iter 2) — аккордеон по `kind`: порядок групп +
 * ru-подписи + подзаголовки; РАЗВЁРНУТ по умолчанию; внутри — по `sortOrder`;
 * клик по карточке-теме → emit `onConceptSelect { id }`. `useEmitOptional`
 * мокнут (прецедент `List`).
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Concepts } from '../Concepts';
import { lessonsStore } from '../store';
import type { ConceptKind, IConceptSummary } from '../types';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

const summary = (id: string, kind: ConceptKind, sortOrder: number): IConceptSummary => ({
  id,
  title: id,
  principle: `${id}-principle`,
  tags: [],
  kind,
  sortOrder,
});

// approach group out of order (b before a) to prove within-group sort by sortOrder.
const CONCEPTS = [
  summary('approach-b', 'approach', 20),
  summary('approach-a', 'approach', 10),
  summary('pattern-x', 'pattern', 10),
  summary('recommend-x', 'recommendation', 10),
];

const mockFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ concepts: CONCEPTS }) })),
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
const orderOf = (...needles: string[]) =>
  needles.map((n) => (container.textContent ?? '').indexOf(n));

describe('Learn.Lessons.Concepts', () => {
  it('lazy-loads on mount', async () => {
    cleanup = render(() => <Concepts />, container);
    await flush();
    expect(fetch).toHaveBeenCalledWith('/learn/concepts');
  });

  it('renders groups in canonical order with ru labels + subtitles', async () => {
    await lessonsStore.loadConcepts('');
    cleanup = render(() => <Concepts />, container);
    await flush();

    // group order: Подход → Паттерн → Рекомендация
    const [approach, pattern, recommend] = orderOf('Подход', 'Паттерн', 'Рекомендация');
    expect(approach).toBeGreaterThanOrEqual(0);
    expect(approach).toBeLessThan(pattern);
    expect(pattern).toBeLessThan(recommend);
    // a subtitle string is present
    expect(container.textContent).toContain('Как думать о языке в целом.');
  });

  it('is expanded by default and sorts items within a group by sortOrder', async () => {
    await lessonsStore.loadConcepts('');
    cleanup = render(() => <Concepts />, container);
    await flush();

    // expanded → item cards mounted; approach-a (10) before approach-b (20)
    const [a, b] = orderOf('approach-a', 'approach-b');
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(b);
  });

  it('click on a concept card emits onConceptSelect', async () => {
    await lessonsStore.loadConcepts('');
    cleanup = render(() => <Concepts />, container);
    await flush();

    const card = cards().find((c) => c.textContent?.includes('pattern-x'));
    (card as HTMLElement).click();

    expect(emitSpy).toHaveBeenCalledWith('onConceptSelect', {
      source: 'Learn.Lessons.Concepts',
      payload: { id: 'pattern-x' },
    });
  });
});
