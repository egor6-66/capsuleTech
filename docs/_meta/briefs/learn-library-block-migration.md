---
title: web-learn — перенос library-браузера из apps/learn в пакет (студийный канон)
status: ready
audience: owner-сессия `claude-scope -Scope learn` (commit-only, ветка feat/wave-voice-auth-gateway)
last_updated: 2026-07-04
adr_refs: [032, 033, 055, 067]
---

# Контекст (мандат user, 2026-07-04)

Канон флоу пакетов ОДИН — студийный: **пакет владеет своим стором** (внутренние
модули общаются через него), апп только монтирует блоки внутри `<Pkg.Provider>`
и ловит именованные события. web-learn задуман зеркалом studio, но
library-браузер собран мимо канона — app-уровневой Feature в `apps/learn`
(features/library + views/wordTile|wordSearch|wordInfo + shapes/wordTiles +
widgets/words|wordInfo). Это дрейф — перенести логику в пакет.

**Образец 1-в-1 — studio**: `packages/web/studio/src/document.ts|selection.ts`
(singleton `createStore`-модуль), `WebStudio.Provider`, product-blocks,
регистрация в `capsule.ts`, тонкие controllers. Прочитай их ПЕРЕД началом.

⚠️ Store блока — **обычный Solid `createStore`-singleton (как в studio), НЕ
XState/Feature**: у прослойки `@xstate/solid` живой баг подмены строки массива
(brief `core-xstate-solid-reconcile-corruption.md`, охота идёт отдельно) —
пакетный флоу от неё не зависит.

# Scope (только packages/web/learn)

1. **`library/store.ts`** — singleton-стор модуля:
   `{ senses: ISense[], selectedId: number | null, query: string, loading }` +
   операции `load(q?)`, `select(id)`, производное `selected()`. Общение
   ВНУТРЕННИХ компонентов блока — только через него.
2. **`library/api.ts`** — тонкий data-слой блока: GET `senses` (`?q=`) c
   apiBase из `Learn.Provider`-контекста (core-контракт уже есть — если
   apiBase в нём не хватает, расширь `core/` Provider: твоя же зона). Форма
   ответа = learn-BFF `/learn/lang/senses` (с `ru` и `audio {url, engines}`,
   ADR 067).
3. **Блоки** (UI пакета пишется НА web-ui напрямую, прецедент studio
   StylesPanel; вёрстку ПЕРЕНЕСИ из apps/learn — она свежая и канонична:
   List batch wrap + тайл en+🔊/фонетика/перевод, Card interactive/selected):
   - `Learn.Library.Search` — инпут поиска → `store.load(q)`;
   - `Learn.Library.Words` — сетка тайлов; клик тайла → `store.select(id)`;
   - `Learn.Library.Info` — панель выбранного (`store.selected()`).
   Блоки РАЗДЕЛЬНЫЕ — апп раскладывает их по слотам Matrix сам.
4. **События наверх (ADR 032)**: через `useEmitOptional` + phantom `__events`
   (образец — shell Picker, `IPickerEvents`):
   - `onWordSelect { sense }` — при選 select;
   - `onSpeak { audioUrl }` — клик 🔊 (плеер/движок — app-концерн, пакет звук
     НЕ играет).
5. **Регистрация** в `capsule.ts`: `Library: { Search, Words, Info }`
   (namespace-блок как WebStudio.*). Экспорт типов.
6. **Тесты**: store-операции; select → data-selected на нужном тайле,
   ПЕРЕЕЗЖАЕТ при повторных select (регрессия к сегодняшнему багу!); emit
   onWordSelect/onSpeak.
7. **OWNERSHIP.md web-learn** — обновить (публичный контракт блока + канон
   «стор внутри пакета»).

# Что НЕ делаешь

- НЕ трогаешь `apps/learn` (схлопывание страницы на блоки — отдельный бриф
  owner-apps после тебя; координация PR — architect).
- НЕ чинишь `@xstate/solid` (отдельная охота owner-core).
- НЕ backend.

# Acceptance

`pnpm --filter @capsuletech/web-learn test` зелёные; build пакета (dist!);
biome 0; typecheck affected. Изменения только `packages/web/learn/**`.
