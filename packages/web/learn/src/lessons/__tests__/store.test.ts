/**
 * lessonsStore unit tests — loadList / open / close (навигация) + эфемерный
 * интерактив дрилла (setAnswer / check / verdict). `open` сбрасывает пласт
 * дрилла — переход на другой урок начинает с чистого листа.
 *
 * Плейн `createStore` (этот модуль) не трогает `@xstate/solid` reconcile-баг
 * (см. `library/store.ts` doc) — гарант, что этот флоу от него независим.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lessonsStore } from '../store';
import type { ILessonDetail, ILessonSummary } from '../types';

const summary = (id: string): ILessonSummary => ({
  id,
  title: id,
  level: 'l3',
  tags: ['grammar'],
});

const drill = (id: string) => ({
  id,
  title: 'Drill',
  level: 'l3',
  tags: [],
  rule: 'r',
  graboTag: id,
  words: [],
  concepts: [],
  items: [{ index: 0, promptRu: 'Я поел.', context: null }],
  words_resolved: [],
});

const detail = (id: string): ILessonDetail => ({
  id,
  title: id,
  level: 'l3',
  tags: [],
  intro: 'intro',
  concepts: [],
  rules: [],
  drills: [drill(`${id}-drill`)],
});

/** URL+method-диспетчер fetch: list / lesson / check. */
const mockFetch = (
  handlers: {
    lessons?: ILessonSummary[];
    lesson?: ILessonDetail;
    check?: { verdict: string; hint?: string; answer?: string };
  } = {},
) => {
  const spy = vi.fn(async (url: string, init?: { method?: string }) => {
    if (init?.method === 'POST') {
      return { ok: true, json: async () => handlers.check ?? { verdict: 'wrong' } };
    }
    if (url.includes('/learn/lessons/')) {
      return { ok: true, json: async () => handlers.lesson ?? detail('x') };
    }
    return { ok: true, json: async () => ({ lessons: handlers.lessons ?? [] }) };
  });
  vi.stubGlobal('fetch', spy);
  return spy;
};

describe('web-learn lessons store', () => {
  beforeEach(() => {
    lessonsStore.close();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadList GETs /learn/lessons and toggles loading', async () => {
    mockFetch({ lessons: [summary('a'), summary('b')] });
    const promise = lessonsStore.loadList('http://api');
    expect(lessonsStore.loading()).toBe(true);
    await promise;

    expect(fetch).toHaveBeenCalledWith('http://api/learn/lessons');
    expect(lessonsStore.lessons().map((l) => l.id)).toEqual(['a', 'b']);
    expect(lessonsStore.loading()).toBe(false);
  });

  it('open GETs the lesson, sets selectedId + current', async () => {
    mockFetch({ lesson: detail('past-perfect') });
    await lessonsStore.open('http://api', 'past-perfect');

    expect(fetch).toHaveBeenCalledWith('http://api/learn/lessons/past-perfect');
    expect(lessonsStore.selectedId()).toBe('past-perfect');
    expect(lessonsStore.current()?.id).toBe('past-perfect');
  });

  it('close clears selection + current', async () => {
    mockFetch({ lesson: detail('x') });
    await lessonsStore.open('http://api', 'x');
    lessonsStore.close();

    expect(lessonsStore.selectedId()).toBeNull();
    expect(lessonsStore.current()).toBeNull();
  });

  it('setAnswer + answer round-trip per item', () => {
    lessonsStore.setAnswer('d1', 0, 'I had eaten');
    expect(lessonsStore.answer('d1', 0)).toBe('I had eaten');
    expect(lessonsStore.answer('d1', 1)).toBe('');
  });

  it('check POSTs item_index + answer, stores verdict', async () => {
    const spy = mockFetch({ check: { verdict: 'correct' } });
    lessonsStore.setAnswer('d1', 0, 'I had eaten');
    await lessonsStore.check('http://api', 'd1', 0);

    const [, init] = spy.mock.calls.at(-1) as [string, { method: string; body: string }];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ item_index: 0, answer: 'I had eaten', reveal: false });
    expect(lessonsStore.verdict('d1', 0)).toEqual({ verdict: 'correct' });
  });

  it('open resets ephemeral drill state (answers/verdicts)', async () => {
    mockFetch({ lesson: detail('x'), check: { verdict: 'correct' } });
    lessonsStore.setAnswer('d1', 0, 'foo');
    await lessonsStore.check('http://api', 'd1', 0);
    expect(lessonsStore.verdict('d1', 0)).not.toBeNull();

    await lessonsStore.open('http://api', 'x');
    expect(lessonsStore.answer('d1', 0)).toBe('');
    expect(lessonsStore.verdict('d1', 0)).toBeNull();
  });
});
