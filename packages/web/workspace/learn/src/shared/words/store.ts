/**
 * wordsStore — singleton-стор атома слов (студийный канон: пакет владеет
 * стором, внутренние компоненты общаются только через него — см.
 * `@capsuletech/web-studio/document.ts`). Обычный Solid `createStore`, НЕ
 * XState/Feature: `@xstate/solid` несёт живой баг подмены строки массива на
 * reconcile (brief `core-xstate-solid-reconcile-corruption.md`) — этот флоу
 * от него не зависит.
 *
 * Это НЕ «library»-стор: держит senses/query/selectedId/load/select — это
 * слова, а не library-view. Живёт в `shared/words/` — юзают многие модули
 * (`Words`-грид, `Search`, `Library.Info`). Модуль композирует атом, не
 * владеет им.
 *
 * `select` + keyed `<For>` в `Words` — единственная защита от регрессии:
 * повторный select должен переносить `data-selected` на корректный тайл, а
 * не залипать/скакать на старом DOM-узле (см. store-тест).
 */
import { createStore } from 'solid-js/store';
import { fetchSenses } from './api';
import type { ISense } from './types';

interface IWordsState {
  senses: ISense[];
  selectedId: number | null;
  query: string;
  loading: boolean;
}

const [state, setState] = createStore<IWordsState>({
  senses: [],
  selectedId: null,
  query: '',
  loading: false,
});

const load = async (apiBase: string, q?: string): Promise<void> => {
  setState('query', q ?? '');
  setState('loading', true);
  try {
    const senses = await fetchSenses(apiBase, q ? { q } : {});
    setState('senses', senses);
  } finally {
    setState('loading', false);
  }
};

const select = (id: number | null): void => {
  setState('selectedId', id);
};

const selected = (): ISense | null => state.senses.find((s) => s.id === state.selectedId) ?? null;

export interface IWordsStore {
  senses: () => ISense[];
  selectedId: () => number | null;
  query: () => string;
  loading: () => boolean;
  /** Производное: резолв `senses` по `selectedId` (или null). */
  selected: () => ISense | null;
  /** GET senses (опционально по `q`); apiBase — явный параметр (см. api.ts). */
  load: (apiBase: string, q?: string) => Promise<void>;
  select: (id: number | null) => void;
}

export const wordsStore: IWordsStore = {
  senses: () => state.senses,
  selectedId: () => state.selectedId,
  query: () => state.query,
  loading: () => state.loading,
  selected,
  load,
  select,
};
