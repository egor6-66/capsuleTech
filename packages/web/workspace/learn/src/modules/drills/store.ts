/**
 * drillsStore — singleton-стор ЭФЕМЕРНОГО интерактива дрилла (ответы/вердикты/
 * флаги проверки, keyed `${drillId}#${itemIndex}`). Обычный Solid `createStore`,
 * НЕ XState/Feature (см. `shared/words/store.ts` — избегаем `@xstate/solid`
 * reconcile-баг).
 *
 * Низшая сущность lessons-домена: НЕ импортит lesson/rule/concept сторы (канон
 * координации «только сверху вниз» — higher-order сущность зовёт `reset`, не
 * наоборот). Прогресс НЕ персистим — это фаза 3; поэтому `reset` при переходе
 * на другой урок/правило (зовут `lessonsStore.open`/`rulesStore.openRule`).
 */
import { createStore, reconcile } from 'solid-js/store';
import { checkDrill } from './api';
import type { ICheckResult } from './types';

const itemKey = (drillId: string, itemIndex: number): string => `${drillId}#${itemIndex}`;

interface IDrillsState {
  answers: Record<string, string>;
  verdicts: Record<string, ICheckResult>;
  checking: Record<string, boolean>;
}

const [state, setState] = createStore<IDrillsState>({
  answers: {},
  verdicts: {},
  checking: {},
});

const reset = (): void => {
  // `reconcile({})` полностью заменяет map — прямой `setState('answers', {})`
  // Solid МЁРЖИТ (пустой объект ничего не чистит), старые ключи бы залипли.
  setState('answers', reconcile({}));
  setState('verdicts', reconcile({}));
  setState('checking', reconcile({}));
};

const setAnswer = (drillId: string, itemIndex: number, value: string): void => {
  setState('answers', itemKey(drillId, itemIndex), value);
};

const check = async (
  apiBase: string,
  drillId: string,
  itemIndex: number,
  reveal = false,
): Promise<void> => {
  const key = itemKey(drillId, itemIndex);
  setState('checking', key, true);
  try {
    const result = await checkDrill(apiBase, drillId, {
      item_index: itemIndex,
      answer: state.answers[key] ?? '',
      reveal,
    });
    setState('verdicts', key, result);
  } finally {
    setState('checking', key, false);
  }
};

export interface IDrillsStore {
  /** Текущий ответ на item дрилла ('' если не введён). */
  answer: (drillId: string, itemIndex: number) => string;
  /** Вердикт по item'у дрилла (null если ещё не проверяли). */
  verdict: (drillId: string, itemIndex: number) => ICheckResult | null;
  /** Идёт ли проверка item'а прямо сейчас. */
  checking: (drillId: string, itemIndex: number) => boolean;
  /** Записать ответ на item дрилла (эфемерно). */
  setAnswer: (drillId: string, itemIndex: number, value: string) => void;
  /** POST проверки ответа item'а; `reveal` — запросить эталон. */
  check: (apiBase: string, drillId: string, itemIndex: number, reveal?: boolean) => Promise<void>;
  /** Сброс всего эфемерного интерактива (зовут higher-order сущности сверху). */
  reset: () => void;
}

export const drillsStore: IDrillsStore = {
  answer: (drillId, itemIndex) => state.answers[itemKey(drillId, itemIndex)] ?? '',
  verdict: (drillId, itemIndex) => state.verdicts[itemKey(drillId, itemIndex)] ?? null,
  checking: (drillId, itemIndex) => state.checking[itemKey(drillId, itemIndex)] ?? false,
  setAnswer,
  check,
  reset,
};
