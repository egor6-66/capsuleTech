---
title: web-learn — refnav: ленивый догруз списков при промахе (wikilink с вкладки концептов не роутит)
status: ready — 🔴 UX-блокер волны (5-10 минут)
audience: owner-сессия `./claude-scope.sh learn` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [069]
---

# Контекст (диагноз architect'а, live)

На `/lessons/concepts/<id>` wikilink `[[grammar-verbs-tenses]]` кликается, но
не роутит: `emitRefNav` резолвит ref по УЖЕ загруженным спискам, а rules-список
грузится только Rules-аккордеоном на его вкладке → на вкладке концептов
`rules()` пуст → warn + no-op. Зависимость резолва от порядка монтирования
вкладок — хрупкость by design.

# Scope (packages/web/learn, lessons/)

1. `refnav.ts`: `emitRefNav` становится async-устойчивым — при промахе по
   обоим спискам: `await ensureLists(apiBase)` (store: loadConcepts+loadRules,
   идемпотентно — уже загруженное не перезагружать) → повторный резолв →
   emit; промах ПОСЛЕ догруза → прежний warn+no-op. Сигнатура получает
   `apiBase` (вызовы в Concept/Rule уже имеют useApiBase()).
2. store: `ensureLists(apiBase)` хелпер (двойной вызов = no-op; гонки — одним
   in-flight промисом).
3. Тесты: wikilink на правило при ПУСТОМ rules-списке (мок fetch) → догруз →
   `onRuleSelect`; unknown ref после догруза → warn, emit не зовётся;
   повторный клик не рефетчит (кэш).

# Acceptance

test/build/biome зелёные; **dist пересобрать**. Live: `:8080/learn/lessons/concepts/word-as-image`
→ клик wikilink в теле → уехали на правило (architect рестартнёт dev при
необходимости).
