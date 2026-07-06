/**
 * rules/api — тонкий data-слой справочника правил (learn-BFF, ADR 067/069)
 * через нативный `fetch`. `apiBase` — явный параметр (стор — singleton вне
 * reactive-scope). Никакого web-query (пакет ещё не зависит).
 */
import type { IRuleDetail, IRuleSummary } from './types';

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
