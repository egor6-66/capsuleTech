/**
 * Learn.Lessons.Rule tests — тело правила в `Prose` + секция «Практика» с ЕГО
 * дриллами (переиспользуют существующий `Drill`: чекер глобален). Дрилл-флоу
 * (correct) и emit `onSpeak` — тот же контракт, что `View`. Fallback до выбора.
 *
 * `useEmitOptional` + `renderMarkdown` мокнуты (прецедент `View`).
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Rule } from '../Rule';
import { lessonsStore } from '../store';
import type { ICheckResult, IRuleDetail } from '../types';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

vi.mock('@capsuletech/web-docs', () => ({
  renderMarkdown: (md: string) => `<p data-md>${md}</p>`,
}));

const RULE: IRuleDetail = {
  id: 'grammar-pronouns',
  title: 'RULE-TITLE',
  body: 'RULE-BODY',
  tags: ['grammar'],
  drills: [
    {
      id: 'd1',
      title: 'DRILL-A',
      level: 'l2',
      tags: [],
      rule: 'grammar-pronouns',
      graboTag: 'd1',
      words: ['see'],
      concepts: [],
      items: [{ index: 0, promptRu: 'Я вижу его.', context: null }],
      words_resolved: [
        {
          text: 'see',
          senseId: 1,
          ru: 'видеть',
          pron_ru: 'си',
          pos: 'verb',
          audio: { url: 'https://a/see.mp3', engines: ['gtts'] },
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
      return { ok: true, json: async () => RULE };
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
  await lessonsStore.openRule('', 'grammar-pronouns');
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
  lessonsStore.close();
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

describe('Learn.Lessons.Rule', () => {
  it('renders the rule body (in Prose) and a «Практика» section with its drills', () => {
    cleanup = render(() => <Rule />, container);
    const text = container.textContent ?? '';

    expect(text).toContain('RULE-TITLE');
    expect(text).toContain('RULE-BODY');
    expect(text).toContain('Практика');
    expect(text).toContain('DRILL-A'); // drill grafted on

    // body rendered inside a Prose container (tokenized typography), not a raw div.
    const proseRoot = container.querySelector('[data-md]')?.parentElement;
    expect(proseRoot?.className).toContain('text-foreground');
  });

  it('fallback when no rule is open', () => {
    lessonsStore.close();
    cleanup = render(() => <Rule />, container);
    expect(container.textContent).toContain('Выберите правило');
  });

  it('drill correct → POSTs the answer and shows ✅ (global checker reused)', async () => {
    checkResponse = { verdict: 'correct' };
    cleanup = render(() => <Rule />, container);

    typeAnswer('I see him');
    await submit('Проверить');

    expect(lastPostBody).toEqual({ item_index: 0, answer: 'I see him', reveal: false });
    expect(container.textContent).toContain('✅ Верно');
  });

  it('speaker on a drill word emits onSpeak with the audio url', async () => {
    cleanup = render(() => <Rule />, container);

    await submit('🔊');

    expect(emitSpy).toHaveBeenCalledWith('onSpeak', {
      source: 'Learn.Lessons.Rule',
      payload: { audioUrl: 'https://a/see.mp3' },
    });
  });
});
