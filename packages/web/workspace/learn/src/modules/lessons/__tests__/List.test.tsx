/**
 * Learn.Lessons.List tests — lazy-load списка на mount, рендер по уроку,
 * клик → `lessonsStore.open` (fetch урока) + emit `onLessonSelect { id }`.
 *
 * `useEmitOptional` мокнут per `Learn.Library.Words` прецедент.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { List } from '../List';
import { lessonsStore } from '../store';
import type { ILessonSummary } from '../types';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

const summary = (id: string): ILessonSummary => ({ id, title: id, level: 'l3', tags: ['grammar'] });

const LESSONS = [summary('past-perfect'), summary('articles')];

const lessonDetail = (id: string) => ({
  id,
  title: id,
  level: 'l3',
  tags: [],
  intro: null,
  concepts: [],
  rules: [],
  drills: [],
});

/** list GET → {lessons}; lesson GET (open) → detail. */
const mockFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/learn/lessons/')) {
        return { ok: true, json: async () => lessonDetail('past-perfect') };
      }
      return { ok: true, json: async () => ({ lessons: LESSONS }) };
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

describe('Learn.Lessons.List', () => {
  it('lazy-loads the list on mount and renders one card per lesson', async () => {
    cleanup = render(() => <List />, container);
    await flush();

    expect(fetch).toHaveBeenCalledWith('/learn/lessons');
    expect(cards()).toHaveLength(2);
  });

  it('click → opens the lesson (fetch) and emits onLessonSelect', async () => {
    await lessonsStore.loadList('');
    cleanup = render(() => <List />, container);
    await flush();

    (cards()[0] as HTMLElement).click();
    await flush();

    expect(emitSpy).toHaveBeenCalledWith('onLessonSelect', {
      source: 'Learn.Lessons.List',
      payload: { id: 'past-perfect' },
    });
    expect(fetch).toHaveBeenCalledWith('/learn/lessons/past-perfect');
    expect(lessonsStore.selectedId()).toBe('past-perfect');
  });
});
