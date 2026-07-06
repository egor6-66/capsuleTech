/**
 * concepts/api — тонкий data-слой библиотеки прозы (learn-BFF, ADR 067/069)
 * через нативный `fetch`. `apiBase` — явный параметр (стор — singleton вне
 * reactive-scope). Никакого web-query (пакет ещё не зависит).
 */
import type { IConcept, IConceptSummary } from './types';

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
