/**
 * lessonsStore unit tests — loadList / open / close (навигация урока) + каскад
 * координации СВЕРХУ ВНИЗ: `open` сбрасывает эфемерный дрилл (`drillsStore`),
 * `close` чистит выбор + кэши концептов/правил + дриллы.
 *
 * Плейн `createStore` (этот модуль) не зависит от `@xstate/solid` reconcile-бага.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drillsStore } from '../../drills/store';
import { lessonsStore } from '../store';
import type { ILessonDetail, ILessonSummary } from '../types';

const summary = (id: string): ILessonSummary => ({ id, title: id, level: 'l3', tags: ['grammar'] });

const detail = (id: string): ILessonDetail => ({
  id,
  title: id,
  level: 'l3',
  tags: [],
  intro: 'intro',
  concepts: [],
  rules: [],
  drills: [],
});

const mockFetch = (handlers: { lessons?: ILessonSummary[]; lesson?: ILessonDetail } = {}) => {
  const spy = vi.fn(async (url: string) => {
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

  it('open resets the ephemeral drill state (cascade to drillsStore)', async () => {
    mockFetch({ lesson: detail('x') });
    drillsStore.setAnswer('d1', 0, 'foo');
    expect(drillsStore.answer('d1', 0)).toBe('foo');

    await lessonsStore.open('http://api', 'x');
    expect(drillsStore.answer('d1', 0)).toBe('');
  });
});
