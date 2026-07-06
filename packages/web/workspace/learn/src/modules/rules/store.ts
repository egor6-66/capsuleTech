/**
 * rulesStore — singleton-стор справочника правил: список правил + **кэш деталей
 * (тело + дриллы) по id**. Обычный Solid `createStore`, НЕ XState/Feature (см.
 * `shared/words/store.ts` — избегаем `@xstate/solid` reconcile-баг).
 *
 * URL-driven: id приходит блокам пропом — стор держит только данные/кэш.
 * `openRule` дедуплицирован: `Rule` + `RuleDrills` на один id = ОДИН fetch.
 * На реальной загрузке (cache-miss) сбрасываем эфемерный интерактив дрилла
 * (`drillsStore.reset()` — rule → drill, канон координации «сверху вниз»):
 * переход на другое правило начинает практику с чистого листа; на cache-hit НЕ
 * трогаем, иначе второй блок затёр бы ответы, введённые в первом.
 *
 * Координация: импортит ТОЛЬКО `drillsStore` (ниже по уровню). НЕ импортит
 * conceptsStore/lessonsStore (siblings/higher — знает координатор `core/`).
 */
import { createStore, reconcile } from 'solid-js/store';
import { drillsStore } from '../drills/store';
import { fetchRule, fetchRules } from './api';
import type { IRuleDetail, IRuleSummary } from './types';

interface IRulesState {
  rules: IRuleSummary[];
  rulesLoading: boolean;
  ruleCache: Record<string, IRuleDetail>;
  ruleInflight: Record<string, boolean>;
}

const [state, setState] = createStore<IRulesState>({
  rules: [],
  rulesLoading: false,
  ruleCache: {},
  ruleInflight: {},
});

const loadRules = async (apiBase: string): Promise<void> => {
  setState('rulesLoading', true);
  try {
    setState('rules', await fetchRules(apiBase));
  } finally {
    setState('rulesLoading', false);
  }
};

/**
 * Загрузить правило (+ его дриллы) по id в кэш. Дедуп по кэшу/inflight — ОДИН
 * fetch, даже если `Rule` и `RuleDrills` дёрнут одновременно. cache-miss
 * сбрасывает эфемерный дрилл (свежая практика на новом правиле); cache-hit — НЕТ.
 */
const openRule = async (apiBase: string, id: string): Promise<void> => {
  if (state.ruleCache[id] || state.ruleInflight[id]) return;
  setState('ruleInflight', id, true);
  drillsStore.reset();
  try {
    setState('ruleCache', id, await fetchRule(apiBase, id));
  } finally {
    setState('ruleInflight', id, false);
  }
};

/** Сброс кэша деталей (список правил сохраняется — как lessons-список). */
const reset = (): void => {
  setState('ruleCache', reconcile({}));
  setState('ruleInflight', reconcile({}));
};

export interface IRulesStore {
  rules: () => IRuleSummary[];
  rulesLoading: () => boolean;
  /** Закэшированное правило (+ дриллы) по id (null, если ещё не загружено). */
  rule: (id: string) => IRuleDetail | null;
  /** Идёт ли сейчас загрузка правила с этим id. */
  ruleOpening: (id: string) => boolean;
  /** GET списка правил (справочник). */
  loadRules: (apiBase: string) => Promise<void>;
  /** GET правила (+ дриллов) в кэш по id (дедуп); cache-miss сбрасывает дрилл. */
  openRule: (apiBase: string, id: string) => Promise<void>;
  /** Сброс кэша деталей (зовёт `lessonsStore.close` сверху). */
  reset: () => void;
}

export const rulesStore: IRulesStore = {
  rules: () => state.rules,
  rulesLoading: () => state.rulesLoading,
  rule: (id) => state.ruleCache[id] ?? null,
  ruleOpening: (id) => state.ruleInflight[id] ?? false,
  loadRules,
  openRule,
  reset,
};
