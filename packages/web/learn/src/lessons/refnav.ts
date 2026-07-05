/**
 * refnav — internal-хелпер кросс-навигации концепт↔правило (wikilinks + чипы
 * relatedRules). Ref ищется в УЖЕ ЗАГРУЖЕННЫХ списках (`lessonsStore.rules()` /
 * `.concepts()`): правило → `onRuleSelect`, концепт → `onConceptSelect`,
 * неизвестный ref → `console.warn` + no-op (не роутим вслепую). Апп-роутинг —
 * концерн родителя (ловит событие, делает `router.goTo`).
 *
 * Имя файла НЕ `nav.ts` намеренно — на case-insensitive FS (Windows) оно бы
 * схлопнулось с `Nav.tsx` (под-навигация) и сломало резолв `./Nav` в барреле.
 *
 * НЕ регистрируется, НЕ в публичном API — building-block для `Rule`/`Concept`.
 */
import { lessonsStore } from './store';

type Emit = (name: string, target: { source: string; payload: { id: string } }) => void;

/** Разрулить wikilink/related ref в событие навигации. */
export const emitRefNav = (ref: string, source: string, emit: Emit): void => {
  if (lessonsStore.rules().some((r) => r.id === ref)) {
    emit('onRuleSelect', { source, payload: { id: ref } });
    return;
  }
  if (lessonsStore.concepts().some((c) => c.id === ref)) {
    emit('onConceptSelect', { source, payload: { id: ref } });
    return;
  }
  console.warn(`[web-learn] wikilink ref не найден в загруженных списках: ${ref}`);
};
