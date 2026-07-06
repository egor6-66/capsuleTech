/**
 * lessons/api — тонкий data-слой уроков (learn-BFF, ADR 067/069) через нативный
 * `fetch`. `apiBase` — явный параметр (стор — singleton вне reactive-scope).
 * Никакого web-query (пакет ещё не зависит).
 */
import type { ILessonDetail, ILessonSummary } from './types';

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
