/**
 * lessonsStore — singleton-стор уроков (тот же канон, что `libraryStore`:
 * пакет владеет стором, внутренние блоки общаются только через него). Обычный
 * Solid `createStore`, НЕ XState/Feature (см. `library/store.ts` — избегаем
 * `@xstate/solid` reconcile-баг).
 *
 * Три пласта состояния:
 *   - уроки: `lessons` (список) / `selectedId` / `current` (полный урок);
 *   - концепты/правила (iter 2, URL-driven): списки + **кэш деталей по id**.
 *     Выбор темы живёт в URL (id приходит блокам ПРОПОМ) — стор больше НЕ
 *     держит «selected»-стейт, только данные/кэш. `open{Concept,Rule}(id)`
 *     дедуплицируются: повторный вызов на закэшированный/загружающийся id —
 *     no-op, поэтому `Rule` и `RuleDrills`, читающие одно правило, дают ОДИН
 *     fetch;
 *   - интерактив дрилла (ЭФЕМЕРНО, не персистим — прогресс = фаза 3):
 *     `answers` / `verdicts` / `checking`, keyed `${drillId}#${itemIndex}`.
 *     `open()` (урок) и cache-miss `openRule()` сбрасывают этот пласт — переход
 *     на другую тему начинает дрилл с чистого листа.
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
  // Концепты (библиотека прозы) — список + кэш деталей по id.
  concepts: IConceptSummary[];
  conceptsLoading: boolean;
  conceptCache: Record<string, IConcept>;
  conceptInflight: Record<string, boolean>;
  // Правила (справочник) — список + кэш деталей (тело + дриллы) по id.
  rules: IRuleSummary[];
  rulesLoading: boolean;
  ruleCache: Record<string, IRuleDetail>;
  ruleInflight: Record<string, boolean>;
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
  conceptsLoading: false,
  conceptCache: {},
  conceptInflight: {},
  rules: [],
  rulesLoading: false,
  ruleCache: {},
  ruleInflight: {},
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
  // Кэши концептов/правил чистим (списки сохраняются — как lessons-список).
  setState('conceptCache', reconcile({}));
  setState('conceptInflight', reconcile({}));
  setState('ruleCache', reconcile({}));
  setState('ruleInflight', reconcile({}));
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

// ── Правила (справочник + дриллы правила) ────────────────────────────────────

const loadRules = async (apiBase: string): Promise<void> => {
  setState('rulesLoading', true);
  try {
    setState('rules', await fetchRules(apiBase));
  } finally {
    setState('rulesLoading', false);
  }
};

// Общий in-flight для `ensureLists` — параллельные промахи резолва (несколько
// wikilink'ов кликнули подряд) не плодят дублирующих fetch'ей.
let ensureInflight: Promise<void> | null = null;

/**
 * Гарантировать, что оба списка (концепты + правила) загружены. Идемпотентно:
 * непустой список НЕ перезагружаем (тот же сигнал «загружено», что у mount'а
 * аккордеонов — `length > 0`); гонки схлопываются одним in-flight промисом.
 * Нужен `refnav`: wikilink с вкладки, где второй список ещё не смонтирован,
 * промахивается по резолву — догружаем и повторяем резолв.
 */
const ensureLists = (apiBase: string): Promise<void> => {
  if (ensureInflight) return ensureInflight;
  const jobs: Promise<void>[] = [];
  if (state.concepts.length === 0) jobs.push(loadConcepts(apiBase));
  if (state.rules.length === 0) jobs.push(loadRules(apiBase));
  if (jobs.length === 0) return Promise.resolve();
  const inflight = Promise.all(jobs)
    .then(() => {})
    .finally(() => {
      ensureInflight = null;
    });
  ensureInflight = inflight;
  return inflight;
};

/**
 * Загрузить правило (+ его дриллы) по id в кэш. Дедуп по кэшу/inflight — ОДИН
 * fetch, даже если `Rule` и `RuleDrills` дёрнут одновременно. На реальной
 * загрузке (cache-miss) сбрасываем эфемерный интерактив дрилла — переход на
 * другое правило начинает практику с чистого листа; на cache-hit НЕ трогаем,
 * иначе второй блок затёр бы ответы, введённые в первом.
 */
const openRule = async (apiBase: string, id: string): Promise<void> => {
  if (state.ruleCache[id] || state.ruleInflight[id]) return;
  setState('ruleInflight', id, true);
  resetDrills();
  try {
    setState('ruleCache', id, await fetchRule(apiBase, id));
  } finally {
    setState('ruleInflight', id, false);
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
  conceptsLoading: () => boolean;
  /** Закэшированный концепт по id (null, если ещё не загружен). */
  concept: (id: string) => IConcept | null;
  /** Идёт ли сейчас загрузка концепта с этим id. */
  conceptOpening: (id: string) => boolean;
  rules: () => IRuleSummary[];
  rulesLoading: () => boolean;
  /** Закэшированное правило (+ дриллы) по id (null, если ещё не загружено). */
  rule: (id: string) => IRuleDetail | null;
  /** Идёт ли сейчас загрузка правила с этим id. */
  ruleOpening: (id: string) => boolean;
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
  /** Сброс кэшей деталей + интерактива (списки остаются). */
  close: () => void;
  /** GET списка концептов (библиотека прозы). */
  loadConcepts: (apiBase: string) => Promise<void>;
  /** GET концепта в кэш по id (дедуп). */
  openConcept: (apiBase: string, id: string) => Promise<void>;
  /** GET списка правил (справочник). */
  loadRules: (apiBase: string) => Promise<void>;
  /** Догрузить оба списка (концепты+правила), если пусты — для `refnav` резолва. */
  ensureLists: (apiBase: string) => Promise<void>;
  /** GET правила (+ дриллов) в кэш по id (дедуп); cache-miss сбрасывает дрилл. */
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
  conceptsLoading: () => state.conceptsLoading,
  concept: (id) => state.conceptCache[id] ?? null,
  conceptOpening: (id) => state.conceptInflight[id] ?? false,
  rules: () => state.rules,
  rulesLoading: () => state.rulesLoading,
  rule: (id) => state.ruleCache[id] ?? null,
  ruleOpening: (id) => state.ruleInflight[id] ?? false,
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
  ensureLists,
  setAnswer,
  check,
};
