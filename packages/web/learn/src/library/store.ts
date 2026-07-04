/**
 * libraryStore — singleton-стор library-блока (студийный канон: пакет владеет
 * стором, внутренние компоненты общаются только через него — см.
 * `@capsuletech/web-studio/document.ts`). Обычный Solid `createStore`, НЕ
 * XState/Feature: `@xstate/solid` несёт живой баг подмены строки массива на
 * reconcile (brief `core-xstate-solid-reconcile-corruption.md`) — этот флоу
 * от него не зависит.
 *
 * `select` + keyed `<For>` в `Words` — единственная защита от регрессии:
 * повторный select должен переносить `data-selected` на корректный тайл, а
 * не залипать/скакать на старом DOM-узле (см. store-тест).
 */
import { createStore } from 'solid-js/store';
import { fetchSenses } from './api';
import type { ISense } from './types';

interface ILibraryState {
  senses: ISense[];
  selectedId: number | null;
  query: string;
  loading: boolean;
}

const [state, setState] = createStore<ILibraryState>({
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

export interface ILibraryStore {
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

export const libraryStore: ILibraryStore = {
  senses: () => state.senses,
  selectedId: () => state.selectedId,
  query: () => state.query,
  loading: () => state.loading,
  selected,
  load,
  select,
};
