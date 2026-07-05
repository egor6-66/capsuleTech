/**
 * Learn.Lessons.RuleDrills tests — практика правила (URL-driven по `id`):
 * секция «Практика» с дриллами из кэша правила; дрилл-флоу correct (общий
 * чекер) + emit `onSpeak`. Ключ iter-2: смонтированный РЯДОМ с `Rule` на тот же
 * id — ОДИН fetch правила (общий кэш/дедуп). `useEmitOptional`/`renderMarkdown`
 * мокнуты (прецедент `Rule`).
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Rule } from '../Rule';
import { RuleDrills } from '../RuleDrills';
import { lessonsStore } from '../store';
import type { ICheckResult, IRuleDetail } from '../types';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

vi.mock('@capsuletech/web-docs', () => ({
  renderMarkdown: (md: string) => md,
}));

const RULE: IRuleDetail = {
  id: 'r1',
  title: 'RULE-TITLE',
  body: 'BODY',
  tags: ['grammar'],
  drills: [
    {
      id: 'd1',
      title: 'DRILL-A',
      level: 'l2',
      tags: [],
      rule: 'r1',
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

const mockFetch = () => {
  const spy = vi.fn(async (_url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === 'POST') {
      lastPostBody = JSON.parse(init.body ?? '{}');
      return { ok: true, json: async () => checkResponse };
    }
    return { ok: true, json: async () => RULE };
  });
  vi.stubGlobal('fetch', spy);
  return spy;
};

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  emitSpy.mockClear();
  checkResponse = { verdict: 'wrong' };
  lastPostBody = undefined;
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
const button = (label: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
const submit = async (label: string) => {
  (button(label) as HTMLElement).click();
  await flush();
};

describe('Learn.Lessons.RuleDrills', () => {
  it('renders «Практика» with the rule drills', async () => {
    await lessonsStore.openRule('', 'r1');
    cleanup = render(() => <RuleDrills id="r1" />, container);
    await flush();

    const text = container.textContent ?? '';
    expect(text).toContain('Практика');
    expect(text).toContain('DRILL-A');
  });

  it('fallback when the rule has no drills / none open', async () => {
    cleanup = render(() => <RuleDrills />, container);
    expect(container.textContent).toContain('Практики нет');
  });

  it('drill correct → POSTs the answer and shows ✅ (global checker)', async () => {
    checkResponse = { verdict: 'correct' };
    await lessonsStore.openRule('', 'r1');
    cleanup = render(() => <RuleDrills id="r1" />, container);
    await flush();

    const input = container.querySelector('input') as HTMLInputElement;
    input.value = 'I see him';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await submit('Проверить');

    expect(lastPostBody).toEqual({ item_index: 0, answer: 'I see him', reveal: false });
    expect(container.textContent).toContain('✅ Верно');
  });

  it('speaker on a drill word emits onSpeak with the audio url', async () => {
    await lessonsStore.openRule('', 'r1');
    cleanup = render(() => <RuleDrills id="r1" />, container);
    await flush();

    await submit('🔊');

    expect(emitSpy).toHaveBeenCalledWith('onSpeak', {
      source: 'Learn.Lessons.RuleDrills',
      payload: { audioUrl: 'https://a/see.mp3' },
    });
  });

  it('mounted alongside Rule on the same id → one rule fetch (shared cache)', async () => {
    const spy = mockFetch(); // fresh spy for this render (no pre-open)
    cleanup = render(
      () => (
        <>
          <Rule id="r1" />
          <RuleDrills id="r1" />
        </>
      ),
      container,
    );
    await flush();

    const ruleFetches = spy.mock.calls.filter(([url]) => String(url).includes('/learn/rules/r1'));
    expect(ruleFetches).toHaveLength(1);
  });
});
