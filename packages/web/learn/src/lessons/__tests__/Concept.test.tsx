/**
 * Learn.Lessons.Concept tests — статья выбранного концепта (title + principle +
 * markdown-тело + примеры), обёрнутая в `Prose`; fallback до выбора.
 *
 * `renderMarkdown` мокнут (не тянем тяжёлый граф `@capsuletech/web-docs`) —
 * проверяем, что тело попадает в DOM ВНУТРИ `Prose`-контейнера (design-tokens
 * типографики), а не в голый `<div>`.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Concept } from '../Concept';
import { lessonsStore } from '../store';
import type { IConcept } from '../types';

vi.mock('@capsuletech/web-docs', () => ({
  renderMarkdown: (md: string) => `<p data-md>${md}</p>`,
}));

const CONCEPT: IConcept = {
  id: 'word-as-image',
  title: 'CONCEPT-TITLE',
  principle: 'CONCEPT-PRINCIPLE',
  body: 'CONCEPT-BODY',
  tags: [],
  examples: [{ en: 'I eat', ru: 'Я ем' }],
  relatedRules: [],
  relatedConcepts: [],
};

const mockFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => CONCEPT })),
  );

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  mockFetch();
  await lessonsStore.openConcept('', 'word-as-image');
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
  lessonsStore.close();
  vi.unstubAllGlobals();
});

describe('Learn.Lessons.Concept', () => {
  it('renders title, principle, markdown body and examples', () => {
    cleanup = render(() => <Concept />, container);
    const text = container.textContent ?? '';

    expect(text).toContain('CONCEPT-TITLE');
    expect(text).toContain('CONCEPT-PRINCIPLE');
    expect(text).toContain('CONCEPT-BODY');
    expect(text).toContain('I eat');
  });

  it('wraps the markdown body in a Prose container (tokenized typography)', () => {
    cleanup = render(() => <Concept />, container);

    const proseRoot = container.querySelector('[data-md]')?.parentElement;
    expect(proseRoot).toBeTruthy();
    // Prose base carries the tokenized foreground color — proof it is not a raw <div>.
    expect(proseRoot?.className).toContain('text-foreground');
  });

  it('fallback when no concept is open', () => {
    lessonsStore.close();
    cleanup = render(() => <Concept />, container);
    expect(container.textContent).toContain('Выберите концепт');
  });
});
