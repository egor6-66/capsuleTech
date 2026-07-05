/**
 * lessonsStore — singleton-стор уроков (тот же канон, что `libraryStore`:
 * пакет владеет стором, внутренние блоки общаются только через него). Обычный
 * Solid `createStore`, НЕ XState/Feature (см. `library/store.ts` — избегаем
 * `@xstate/solid` reconcile-баг).
 *
 * Два пласта состояния:
 *   - навигация: `lessons` (список) / `selectedId` / `current` (полный урок);
 *   - интерактив дрилла (ЭФЕМЕРНО, не персистим — прогресс = фаза 3):
 *     `answers` / `verdicts` / `checking`, keyed `${drillId}#${itemIndex}`.
 *     `open()`/`close()` сбрасывают этот пласт — переход на другой урок
 *     начинает дрилл с чистого листа.
 */
import { createStore, reconcile } from 'solid-js/store';
import {
  checkDrill,
  fetchConcept,
  fetchConcepts,
  fetchLesson,
  fetchLessons,
  fetchRule,
  fetchRules,
} from './api';
import type {
  ICheckResult,
  IConcept,
  IConceptSummary,
  ILessonDetail,
  ILessonSummary,
  IRuleDetail,
  IRuleSummary,
} from './types';

const itemKey = (drillId: string, itemIndex: number): string => `${drillId}#${itemIndex}`;

interface ILessonsState {
  lessons: ILessonSummary[];
  selectedId: string | null;
  current: ILessonDetail | null;
  loading: boolean;
  opening: boolean;
  // Концепты (библиотека прозы) — список + текущая статья.
  concepts: IConceptSummary[];
  selectedConceptId: string | null;
  currentConcept: IConcept | null;
  conceptsLoading: boolean;
  conceptOpening: boolean;
  // Правила (справочник) — список + текущее правило (тело + его дриллы).
  rules: IRuleSummary[];
  selectedRuleId: string | null;
  currentRule: IRuleDetail | null;
  rulesLoading: boolean;
  ruleOpening: boolean;
  answers: Record<string, string>;
  verdicts: Record<string, ICheckResult>;
  checking: Record<string, boolean>;
}

const [state, setState] = createStore<ILessonsState>({
  lessons: [],
  selectedId: null,
  current: null,
  loading: false,
  opening: false,
  concepts: [],
  selectedConceptId: null,
  currentConcept: null,
  conceptsLoading: false,
  conceptOpening: false,
  rules: [],
  selectedRuleId: null,
  currentRule: null,
  rulesLoading: false,
  ruleOpening: false,
  answers: {},
  verdicts: {},
  checking: {},
});

const resetDrills = (): void => {
  // `reconcile({})` полностью заменяет map — прямой `setState('answers', {})`
  // Solid МЁРЖИТ (пустой объект ничего не чистит), старые ключи бы залипли.
  setState('answers', reconcile({}));
  setState('verdicts', reconcile({}));
  setState('checking', reconcile({}));
};

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
  resetDrills();
  try {
    setState('current', await fetchLesson(apiBase, id));
  } finally {
    setState('opening', false);
  }
};

const close = (): void => {
  setState('selectedId', null);
  setState('current', null);
  // Сброс выбора концепта/правила (списки сохраняются — как lessons-список).
  setState('selectedConceptId', null);
  setState('currentConcept', null);
  setState('selectedRuleId', null);
  setState('currentRule', null);
  resetDrills();
};

// ── Концепты (библиотека прозы) ──────────────────────────────────────────────

const loadConcepts = async (apiBase: string): Promise<void> => {
  setState('conceptsLoading', true);
  try {
    setState('concepts', await fetchConcepts(apiBase));
  } finally {
    setState('conceptsLoading', false);
  }
};

const openConcept = async (apiBase: string, id: string): Promise<void> => {
  setState('selectedConceptId', id);
  setState('conceptOpening', true);
  try {
    setState('currentConcept', await fetchConcept(apiBase, id));
  } finally {
    setState('conceptOpening', false);
  }
};

// ── Правила (справочник + дриллы правила) ────────────────────────────────────

const loadRules = async (apiBase: string): Promise<void> => {
  setState('rulesLoading', true);
  try {
    setState('rules', await fetchRules(apiBase));
  } finally {
    setState('rulesLoading', false);
  }
};

const openRule = async (apiBase: string, id: string): Promise<void> => {
  setState('selectedRuleId', id);
  setState('ruleOpening', true);
  // Правило несёт свои дриллы («Практика») — тот же чекер, что урок; переход
  // на другое правило начинает интерактив с чистого листа.
  resetDrills();
  try {
    setState('currentRule', await fetchRule(apiBase, id));
  } finally {
    setState('ruleOpening', false);
  }
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

export interface ILessonsStore {
  lessons: () => ILessonSummary[];
  selectedId: () => string | null;
  current: () => ILessonDetail | null;
  loading: () => boolean;
  opening: () => boolean;
  concepts: () => IConceptSummary[];
  selectedConceptId: () => string | null;
  currentConcept: () => IConcept | null;
  conceptsLoading: () => boolean;
  conceptOpening: () => boolean;
  rules: () => IRuleSummary[];
  selectedRuleId: () => string | null;
  currentRule: () => IRuleDetail | null;
  rulesLoading: () => boolean;
  ruleOpening: () => boolean;
  /** Текущий ответ на item дрилла ('' если не введён). */
  answer: (drillId: string, itemIndex: number) => string;
  /** Вердикт по item'у дрилла (null если ещё не проверяли). */
  verdict: (drillId: string, itemIndex: number) => ICheckResult | null;
  /** Идёт ли проверка item'а прямо сейчас. */
  checking: (drillId: string, itemIndex: number) => boolean;
  /** GET списка уроков; apiBase — явный параметр (см. api.ts). */
  loadList: (apiBase: string) => Promise<void>;
  /** GET полного урока + сброс интерактива дрилла. */
  open: (apiBase: string, id: string) => Promise<void>;
  /** Сброс выбора + интерактива. */
  close: () => void;
  /** GET списка концептов (библиотека прозы). */
  loadConcepts: (apiBase: string) => Promise<void>;
  /** GET полного концепта (статья). */
  openConcept: (apiBase: string, id: string) => Promise<void>;
  /** GET списка правил (справочник). */
  loadRules: (apiBase: string) => Promise<void>;
  /** GET правила + его дриллов + сброс интерактива дрилла. */
  openRule: (apiBase: string, id: string) => Promise<void>;
  /** Записать ответ на item дрилла (эфемерно). */
  setAnswer: (drillId: string, itemIndex: number, value: string) => void;
  /** POST проверки ответа item'а; `reveal` — запросить эталон. */
  check: (apiBase: string, drillId: string, itemIndex: number, reveal?: boolean) => Promise<void>;
}

export const lessonsStore: ILessonsStore = {
  lessons: () => state.lessons,
  selectedId: () => state.selectedId,
  current: () => state.current,
  loading: () => state.loading,
  opening: () => state.opening,
  concepts: () => state.concepts,
  selectedConceptId: () => state.selectedConceptId,
  currentConcept: () => state.currentConcept,
  conceptsLoading: () => state.conceptsLoading,
  conceptOpening: () => state.conceptOpening,
  rules: () => state.rules,
  selectedRuleId: () => state.selectedRuleId,
  currentRule: () => state.currentRule,
  rulesLoading: () => state.rulesLoading,
  ruleOpening: () => state.ruleOpening,
  answer: (drillId, itemIndex) => state.answers[itemKey(drillId, itemIndex)] ?? '',
  verdict: (drillId, itemIndex) => state.verdicts[itemKey(drillId, itemIndex)] ?? null,
  checking: (drillId, itemIndex) => state.checking[itemKey(drillId, itemIndex)] ?? false,
  loadList,
  open,
  close,
  loadConcepts,
  openConcept,
  loadRules,
  openRule,
  setAnswer,
  check,
};
