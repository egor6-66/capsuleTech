/**
 * words/api — тонкий data-слой атома слов. GET `/learn/lang/senses`
 * (learn-BFF, ADR 067) через нативный `fetch`. Никакого web-query — пакет
 * ещё не зависит от него (см. OWNERSHIP «Vendor stack»); `apiBase` приходит
 * явным параметром (не читает контекст — сохраняет `store.ts` вне Solid
 * reactive-scope, singleton-модуль вызывается и вне компонентов).
 */
import type { ISense } from './types';

export interface IFetchSensesParams {
  q?: string;
}

export const fetchSenses = async (
  apiBase: string,
  params: IFetchSensesParams = {},
): Promise<ISense[]> => {
  const query = params.q ? `?q=${encodeURIComponent(params.q)}` : '';
  const res = await fetch(`${apiBase}/learn/lang/senses${query}`);
  if (!res.ok) {
    throw new Error(`[web-learn] GET /learn/lang/senses failed: ${res.status}`);
  }
  const data = (await res.json()) as { senses: ISense[] };
  return data.senses;
};
