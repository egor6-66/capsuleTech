/**
 * Learn.Lessons.Concepts tests — lazy-load списка на mount, карточка на концепт
 * (title + principle), клик → `lessonsStore.openConcept` (fetch статьи) + emit
 * `onConceptSelect { id }`. `useEmitOptional` мокнут (прецедент `List`).
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Concepts } from '../Concepts';
import { lessonsStore } from '../store';
import type { IConceptSummary } from '../types';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

const summary = (id: string): IConceptSummary => ({
  id,
  title: id,
  principle: `${id}-principle`,
  tags: [],
});

const CONCEPTS = [summary('word-as-image'), summary('spaced-repetition')];

const conceptDetail = (id: string) => ({
  id,
  title: id,
  principle: `${id}-principle`,
  body: `# ${id}`,
  tags: [],
  examples: [],
  relatedRules: [],
  relatedConcepts: [],
});

const mockFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/learn/concepts/')) {
        return { ok: true, json: async () => conceptDetail('word-as-image') };
      }
      return { ok: true, json: async () => ({ concepts: CONCEPTS }) };
    }),
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

describe('Learn.Lessons.Concepts', () => {
  it('lazy-loads on mount, one card per concept with its principle', async () => {
    cleanup = render(() => <Concepts />, container);
    await flush();

    expect(fetch).toHaveBeenCalledWith('/learn/concepts');
    expect(cards()).toHaveLength(2);
    expect(container.textContent).toContain('word-as-image-principle');
  });

  it('click → opens the concept (fetch) and emits onConceptSelect', async () => {
    await lessonsStore.loadConcepts('');
    cleanup = render(() => <Concepts />, container);
    await flush();

    (cards()[0] as HTMLElement).click();
    await flush();

    expect(emitSpy).toHaveBeenCalledWith('onConceptSelect', {
      source: 'Learn.Lessons.Concepts',
      payload: { id: 'word-as-image' },
    });
    expect(fetch).toHaveBeenCalledWith('/learn/concepts/word-as-image');
    expect(lessonsStore.selectedConceptId()).toBe('word-as-image');
  });
});
