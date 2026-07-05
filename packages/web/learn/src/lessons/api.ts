/**
 * lessons/api — тонкий data-слой уроков (learn-BFF, ADR 067/069) через
 * нативный `fetch`. Никакого web-query — пакет ещё не зависит от него (см.
 * OWNERSHIP «Vendor stack»); `apiBase` приходит явным параметром (не читает
 * контекст — сохраняет `store.ts` вне Solid reactive-scope, singleton-модуль
 * вызывается и вне компонентов). Образец — `library/api.ts`.
 */
import type {
  ICheckRequest,
  ICheckResult,
  IConcept,
  IConceptSummary,
  ILessonDetail,
  ILessonSummary,
  IRuleDetail,
  IRuleSummary,
} from './types';

/** GET `/learn/lessons` → список уроков (бэк отдаёт `{ lessons: [...] }`). */
export const fetchLessons = async (apiBase: string): Promise<ILessonSummary[]> => {
  const res = await fetch(`${apiBase}/learn/lessons`);
  if (!res.ok) {
    throw new Error(`[web-learn] GET /learn/lessons failed: ${res.status}`);
  }
  const data = (await res.json()) as { lessons: ILessonSummary[] };
  return data.lessons;
};

/** GET `/learn/lessons/{id}` → полный урок (concepts/rules/drills + words_resolved). */
export const fetchLesson = async (apiBase: string, id: string): Promise<ILessonDetail> => {
  const res = await fetch(`${apiBase}/learn/lessons/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`[web-learn] GET /learn/lessons/${id} failed: ${res.status}`);
  }
  return (await res.json()) as ILessonDetail;
};

/** GET `/learn/concepts` → библиотека прозы (бэк отдаёт `{ concepts: [...] }`). */
export const fetchConcepts = async (apiBase: string): Promise<IConceptSummary[]> => {
  const res = await fetch(`${apiBase}/learn/concepts`);
  if (!res.ok) {
    throw new Error(`[web-learn] GET /learn/concepts failed: ${res.status}`);
  }
  const data = (await res.json()) as { concepts: IConceptSummary[] };
  return data.concepts;
};

/** GET `/learn/concepts/{id}` → полный концепт (принцип + markdown-тело + связи). */
export const fetchConcept = async (apiBase: string, id: string): Promise<IConcept> => {
  const res = await fetch(`${apiBase}/learn/concepts/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`[web-learn] GET /learn/concepts/${id} failed: ${res.status}`);
  }
  return (await res.json()) as IConcept;
};

/** GET `/learn/rules` → справочник правил (бэк отдаёт `{ rules: [...] }`). */
export const fetchRules = async (apiBase: string): Promise<IRuleSummary[]> => {
  const res = await fetch(`${apiBase}/learn/rules`);
  if (!res.ok) {
    throw new Error(`[web-learn] GET /learn/rules failed: ${res.status}`);
  }
  const data = (await res.json()) as { rules: IRuleSummary[] };
  return data.rules;
};

/** GET `/learn/rules/{id}` → правило + ЕГО дриллы (composed, санитизированные items). */
export const fetchRule = async (apiBase: string, id: string): Promise<IRuleDetail> => {
  const res = await fetch(`${apiBase}/learn/rules/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`[web-learn] GET /learn/rules/${id} failed: ${res.status}`);
  }
  return (await res.json()) as IRuleDetail;
};

/** POST `/learn/drills/{id}/check` → вердикт (ключ ответа остаётся на бэке). */
export const checkDrill = async (
  apiBase: string,
  drillId: string,
  body: ICheckRequest,
): Promise<ICheckResult> => {
  const res = await fetch(`${apiBase}/learn/drills/${encodeURIComponent(drillId)}/check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`[web-learn] POST /learn/drills/${drillId}/check failed: ${res.status}`);
  }
  return (await res.json()) as ICheckResult;
};
