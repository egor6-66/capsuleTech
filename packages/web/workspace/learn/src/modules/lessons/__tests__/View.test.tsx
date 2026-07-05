/**
 * Learn.Lessons.View tests — маршрут по порядку (intro → concepts → rules →
 * drills), дрилл-флоу (correct / near_miss с хинтом / wrong / reveal) и emit
 * `onSpeak` со слова дрилла.
 *
 * `useEmitOptional` мокнут (прецедент `Words`); `renderMarkdown` мокнут, чтобы
 * не тянуть тяжёлый граф `@capsuletech/web-docs` (marked/DocPage) в юнит —
 * проверяем, что тело концепта/правила попадает в DOM.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lessonsStore } from '../store';
import type { ICheckResult, ILessonDetail } from '../types';
import { View } from '../View';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

vi.mock('@capsuletech/web-docs', () => ({
  renderMarkdown: (md: string) => `<p data-md>${md}</p>`,
}));

const LESSON: ILessonDetail = {
  id: 'past-perfect',
  title: 'Past Perfect',
  level: 'l3',
  tags: [],
  intro: 'INTRO-TEXT',
  concepts: [
    {
      id: 'c1',
      title: 'CONCEPT-A',
      principle: 'PRINCIPLE-A',
      body: 'CONCEPT-BODY',
      tags: [],
      examples: [],
      relatedRules: [],
      relatedConcepts: [],
    },
  ],
  rules: [{ id: 'r1', title: 'RULE-A', body: 'RULE-BODY', tags: [] }],
  drills: [
    {
      id: 'd1',
      title: 'DRILL-A',
      level: 'l3',
      tags: [],
      rule: 'r1',
      graboTag: 'd1',
      words: ['eat'],
      concepts: [],
      items: [{ index: 0, promptRu: 'Я уже поел.', context: 'CTX' }],
      words_resolved: [
        {
          text: 'eat',
          senseId: 10,
          ru: 'есть',
          pron_ru: 'ит',
          pos: 'verb',
          audio: { url: 'https://a/eat.mp3', engines: ['gtts'] },
          image: null,
        },
      ],
    },
  ],
};

let checkResponse: ICheckResult = { verdict: 'wrong' };
let lastPostBody: unknown;

const mockFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === 'POST') {
        lastPostBody = JSON.parse(init.body ?? '{}');
        return { ok: true, json: async () => checkResponse };
      }
      return { ok: true, json: async () => LESSON };
    }),
  );

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  emitSpy.mockClear();
  checkResponse = { verdict: 'wrong' };
  lastPostBody = undefined;
  mockFetch();
  await lessonsStore.open('', 'past-perfect');
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
  vi.unstubAllGlobals();
});

const flush = () => new Promise((r) => setTimeout(r, 0));
const button = (label: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
const submit = async (label: string) => {
  (button(label) as HTMLElement).click();
  await flush();
};
const typeAnswer = (value: string) => {
  const input = container.querySelector('input') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('Learn.Lessons.View', () => {
  it('renders the route in order: intro → concepts → rules → drills', () => {
    cleanup = render(() => <View />, container);
    const text = container.textContent ?? '';

    expect(text).toContain('INTRO-TEXT');
    expect(text).toContain('CONCEPT-BODY'); // markdown body rendered
    expect(text).toContain('RULE-BODY');
    // order preserved: concept before rule before drill
    expect(text.indexOf('CONCEPT-A')).toBeLessThan(text.indexOf('RULE-A'));
    expect(text.indexOf('RULE-A')).toBeLessThan(text.indexOf('DRILL-A'));
  });

  it('fallback when no lesson is open', () => {
    lessonsStore.close();
    cleanup = render(() => <View />, container);
    expect(container.textContent).toContain('Выберите урок');
  });

  it('drill correct → shows ✅', async () => {
    checkResponse = { verdict: 'correct' };
    cleanup = render(() => <View />, container);

    typeAnswer('I had eaten');
    await submit('Проверить');

    expect(lastPostBody).toEqual({ item_index: 0, answer: 'I had eaten', reveal: false });
    expect(container.textContent).toContain('✅ Верно');
  });

  it('drill near_miss → shows the hint', async () => {
    checkResponse = { verdict: 'near_miss', hint: 'проверь время' };
    cleanup = render(() => <View />, container);

    typeAnswer('I have eaten');
    await submit('Проверить');

    expect(container.textContent).toContain('Почти: проверь время');
  });

  it('drill wrong → shows «Мимо»', async () => {
    checkResponse = { verdict: 'wrong' };
    cleanup = render(() => <View />, container);

    typeAnswer('nonsense');
    await submit('Проверить');

    expect(container.textContent).toContain('Мимо');
  });

  it('reveal → POSTs reveal:true and shows the answer', async () => {
    checkResponse = { verdict: 'wrong', answer: 'I had eaten' };
    cleanup = render(() => <View />, container);

    await submit('Показать ответ');

    expect(lastPostBody).toMatchObject({ reveal: true });
    expect(container.textContent).toContain('Ответ: I had eaten');
  });

  it('speaker on a drill word emits onSpeak with the audio url', async () => {
    cleanup = render(() => <View />, container);

    await submit('🔊');

    expect(emitSpy).toHaveBeenCalledWith('onSpeak', {
      source: 'Learn.Lessons.View',
      payload: { audioUrl: 'https://a/eat.mp3' },
    });
  });
});
