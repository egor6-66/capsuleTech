/**
 * core/refnav — координатор кросс-навигации концепт↔правило (cross-cutting).
 * ЕДИНСТВЕННОЕ место, что знает про НЕСКОЛЬКО сущностных сторов
 * (`conceptsStore` + `rulesStore`) — сами сторы друг друга не импортят (канон
 * координации). Живёт в `core/`, потому что резолв ref'а инвариантен к тому, с
 * какой вкладки (концепт/правило) пришёл wikilink.
 *
 * `ensureLists` — идемпотентный догруз ОБОИХ списков (для резолва): непустой
 * список НЕ перезагружаем (сигнал «загружено» — `length > 0`, тот же что у
 * mount'а аккордеонов); параллельные промахи схлопываются одним in-flight.
 *
 * `emitRefNav` — async-устойчивый резолв: сначала ищем ref в загруженных
 * списках (hit эмитит СИНХРОННО); при промахе — `ensureLists` (wikilink с
 * вкладки, где второй список ещё не смонтирован) и повторяем один раз. Промах
 * ПОСЛЕ догруза → ref реально неизвестен → `console.warn` + no-op.
 *
 * Имя файла НЕ `nav.ts` намеренно — на case-insensitive FS (Windows) оно бы
 * схлопнулось с `Nav.tsx` и сломало резолв в барреле. НЕ в публичном API
 * (`core/index.ts` его не реэкспортит) — internal building-block блоков.
 */
import { conceptsStore } from '../modules/concepts/store';
import { rulesStore } from '../modules/rules/store';

type Emit = (name: string, target: { source: string; payload: { id: string } }) => void;

// Общий in-flight для `ensureLists` — параллельные промахи резолва (несколько
// wikilink'ов кликнули подряд) не плодят дублирующих fetch'ей.
let ensureInflight: Promise<void> | null = null;

/**
 * Гарантировать, что оба списка (концепты + правила) загружены. Идемпотентно:
 * непустой список НЕ перезагружаем; гонки схлопываются одним in-flight промисом.
 */
export const ensureLists = (apiBase: string): Promise<void> => {
  if (ensureInflight) return ensureInflight;
  const jobs: Promise<void>[] = [];
  if (conceptsStore.concepts().length === 0) jobs.push(conceptsStore.loadConcepts(apiBase));
  if (rulesStore.rules().length === 0) jobs.push(rulesStore.loadRules(apiBase));
  if (jobs.length === 0) return Promise.resolve();
  const inflight = Promise.all(jobs)
    .then(() => {})
    .finally(() => {
      ensureInflight = null;
    });
  ensureInflight = inflight;
  return inflight;
};

/** Попытка резолва по текущим спискам; `true` если событие эмитнули. */
const tryResolve = (ref: string, source: string, emit: Emit): boolean => {
  if (rulesStore.rules().some((r) => r.id === ref)) {
    emit('onRuleSelect', { source, payload: { id: ref } });
    return true;
  }
  if (conceptsStore.concepts().some((c) => c.id === ref)) {
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
  await ensureLists(apiBase);
  if (tryResolve(ref, source, emit)) return;
  console.warn(`[web-learn] wikilink ref не найден: ${ref}`);
};
