/**
 * conceptsStore — singleton-стор библиотеки прозы: список концептов + **кэш
 * деталей по id**. Обычный Solid `createStore`, НЕ XState/Feature (см.
 * `shared/words/store.ts` — избегаем `@xstate/solid` reconcile-баг).
 *
 * URL-driven: выбор темы живёт в URL (id приходит блокам пропом) — стор держит
 * только данные/кэш, НЕ «selected»-стейт. `openConcept` дедуплицирован:
 * повторный вызов на закэшированный/загружающийся id — no-op.
 *
 * Независимая сущность: НЕ импортит rulesStore/drillsStore/lessonsStore (канон
 * координации — про несколько сторов знает только core-координатор + higher-order
 * `lessonsStore`, зовущий `reset` сверху).
 */
import { createStore, reconcile } from 'solid-js/store';
import { fetchConcept, fetchConcepts } from './api';
import type { IConcept, IConceptSummary } from './types';

interface IConceptsState {
  concepts: IConceptSummary[];
  conceptsLoading: boolean;
  conceptCache: Record<string, IConcept>;
  conceptInflight: Record<string, boolean>;
}

const [state, setState] = createStore<IConceptsState>({
  concepts: [],
  conceptsLoading: false,
  conceptCache: {},
  conceptInflight: {},
});

const loadConcepts = async (apiBase: string): Promise<void> => {
  setState('conceptsLoading', true);
  try {
    setState('concepts', await fetchConcepts(apiBase));
  } finally {
    setState('conceptsLoading', false);
  }
};

/** Загрузить концепт по id в кэш. Дедуп: закэшированный/загружающийся id — no-op. */
const openConcept = async (apiBase: string, id: string): Promise<void> => {
  if (state.conceptCache[id] || state.conceptInflight[id]) return;
  setState('conceptInflight', id, true);
  try {
    setState('conceptCache', id, await fetchConcept(apiBase, id));
  } finally {
    setState('conceptInflight', id, false);
  }
};

/** Сброс кэша деталей (список концептов сохраняется — как lessons-список). */
const reset = (): void => {
  setState('conceptCache', reconcile({}));
  setState('conceptInflight', reconcile({}));
};

export interface IConceptsStore {
  concepts: () => IConceptSummary[];
  conceptsLoading: () => boolean;
  /** Закэшированный концепт по id (null, если ещё не загружен). */
  concept: (id: string) => IConcept | null;
  /** Идёт ли сейчас загрузка концепта с этим id. */
  conceptOpening: (id: string) => boolean;
  /** GET списка концептов (библиотека прозы). */
  loadConcepts: (apiBase: string) => Promise<void>;
  /** GET концепта в кэш по id (дедуп). */
  openConcept: (apiBase: string, id: string) => Promise<void>;
  /** Сброс кэша деталей (зовёт `lessonsStore.close` сверху). */
  reset: () => void;
}

export const conceptsStore: IConceptsStore = {
  concepts: () => state.concepts,
  conceptsLoading: () => state.conceptsLoading,
  concept: (id) => state.conceptCache[id] ?? null,
  conceptOpening: (id) => state.conceptInflight[id] ?? false,
  loadConcepts,
  openConcept,
  reset,
};
