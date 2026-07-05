/**
 * refnav — internal-хелпер кросс-навигации концепт↔правило (wikilinks + чипы
 * relatedRules): правило → `onRuleSelect`, концепт → `onConceptSelect`.
 *
 * Резолв async-устойчив. Сначала ищем ref в уже загруженных списках
 * (`lessonsStore.rules()` / `.concepts()`) — hit эмитит СИНХРОННО. При промахе
 * по обоим (типичный кейс: wikilink с вкладки, где второй список ещё не
 * смонтирован своим аккордеоном) — `await lessonsStore.ensureLists(apiBase)`
 * (идемпотентный догруз) и повторяем резолв. Промах ПОСЛЕ догруза → ref реально
 * неизвестен → `console.warn` + no-op (не роутим вслепую). Апп-роутинг — концерн
 * родителя (ловит событие, делает `router.goTo`).
 *
 * Имя файла НЕ `nav.ts` намеренно — на case-insensitive FS (Windows) оно бы
 * схлопнулось с `Nav.tsx` (под-навигация) и сломало резолв `./Nav` в барреле.
 *
 * НЕ регистрируется, НЕ в публичном API — building-block для `Rule`/`Concept`.
 */
import { lessonsStore } from './store';

type Emit = (name: string, target: { source: string; payload: { id: string } }) => void;

/** Попытка резолва по текущим спискам; `true` если событие эмитнули. */
const tryResolve = (ref: string, source: string, emit: Emit): boolean => {
  if (lessonsStore.rules().some((r) => r.id === ref)) {
    emit('onRuleSelect', { source, payload: { id: ref } });
    return true;
  }
  if (lessonsStore.concepts().some((c) => c.id === ref)) {
    emit('onConceptSelect', { source, payload: { id: ref } });
    return true;
  }
  return false;
};

/** Разрулить wikilink/related ref в событие навигации (с ленивым догрузом списков). */
export const emitRefNav = async (
  ref: string,
  apiBase: string,
  source: string,
  emit: Emit,
): Promise<void> => {
  if (tryResolve(ref, source, emit)) return;
  // Промах по загруженным — возможно, нужный список ещё не смонтирован. Догрузим
  // (идемпотентно) и повторим один раз.
  await lessonsStore.ensureLists(apiBase);
  if (tryResolve(ref, source, emit)) return;
  console.warn(`[web-learn] wikilink ref не найден: ${ref}`);
};
