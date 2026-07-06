/**
 * drills/api — тонкий data-слой чекера дрилла (learn-BFF, ADR 067/069) через
 * нативный `fetch`. `apiBase` — явный параметр (стор — singleton вне
 * reactive-scope). Ключ ответа остаётся на бэке (канон user «фронт = интерфейс»).
 */
import type { ICheckRequest, ICheckResult } from './types';

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
