/**
 * lessonsStore — singleton-стор уроков: список + `selectedId` + `current`
 * (полный урок). Обычный Solid `createStore`, НЕ XState/Feature (см.
 * `shared/words/store.ts` — избегаем `@xstate/solid` reconcile-баг).
 *
 * Урок — higher-order сущность: координирует нижние сторы СВЕРХУ ВНИЗ (канон).
 *   - `open()` сбрасывает эфемерный дрилл (`drillsStore.reset()`) — переход на
 *     другой урок начинает практику с чистого листа;
 *   - `close()` чистит кэши концептов/правил + дриллы
 *     (`conceptsStore.reset()`/`rulesStore.reset()`/`drillsStore.reset()`);
 *     сами СПИСКИ концептов/правил сохраняются (как lessons-список).
 * Нижние сторы lessonsStore НЕ импортят обратно — только он знает про них.
 */
import { createStore } from 'solid-js/store';
import { conceptsStore } from '../concepts/store';
import { drillsStore } from '../drills/store';
import { rulesStore } from '../rules/store';
import { fetchLesson, fetchLessons } from './api';
import type { ILessonDetail, ILessonSummary } from './types';

interface ILessonsState {
  lessons: ILessonSummary[];
  selectedId: string | null;
  current: ILessonDetail | null;
  loading: boolean;
  opening: boolean;
}

const [state, setState] = createStore<ILessonsState>({
  lessons: [],
  selectedId: null,
  current: null,
  loading: false,
  opening: false,
});

const loadList = async (apiBase: string): Promise<void> => {
  setState('loading', true);
  try {
    setState('lessons', await fetchLessons(apiBase));
  } finally {
    setState('loading', false);
  }
};

const open = async (apiBase: string, id: string): Promise<void> => {
  setState('selectedId', id);
  setState('opening', true);
  drillsStore.reset();
  try {
    setState('current', await fetchLesson(apiBase, id));
  } finally {
    setState('opening', false);
  }
};

const close = (): void => {
  setState('selectedId', null);
  setState('current', null);
  // Кэши деталей концептов/правил + дриллы чистим (списки сохраняются).
  conceptsStore.reset();
  rulesStore.reset();
  drillsStore.reset();
};

export interface ILessonsStore {
  lessons: () => ILessonSummary[];
  selectedId: () => string | null;
  current: () => ILessonDetail | null;
  loading: () => boolean;
  opening: () => boolean;
  /** GET списка уроков; apiBase — явный параметр (см. api.ts). */
  loadList: (apiBase: string) => Promise<void>;
  /** GET полного урока + сброс интерактива дрилла. */
  open: (apiBase: string, id: string) => Promise<void>;
  /** Сброс выбора + кэшей концептов/правил + интерактива (списки остаются). */
  close: () => void;
}

export const lessonsStore: ILessonsStore = {
  lessons: () => state.lessons,
  selectedId: () => state.selectedId,
  current: () => state.current,
  loading: () => state.loading,
  opening: () => state.opening,
  loadList,
  open,
  close,
};
