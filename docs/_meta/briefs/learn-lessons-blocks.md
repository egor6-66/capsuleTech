---
title: web-learn — Learn.Lessons.* блоки (список, урок-путь, дрилл-интерактив) — зеркало library-паттерна
status: ready (данные: /learn/lessons* живы; чекер /learn/drills/*/check — параллельный бриф backend-learn-drill-checker, интерактив дрилла зависит от него)
audience: owner-сессия `claude-scope -Scope learn` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [032, 033, 069]
---

# Контекст

Бэк готов: `GET /learn/lessons` (список), `GET /learn/lessons/{id}` (урок:
intro + упорядоченные concepts/rules/drills + `words_resolved` на дриллах —
ru/pron_ru/audio/image). Чекер: `POST /learn/drills/{id}/check
{item_index, answer, reveal?}` → `{verdict: correct|near_miss|wrong, hint?,
answer?}` (в работе параллельно — контракт зафиксирован брифом). В выдаче
урока item'ы дрилла БЕЗ ответов (санитизировано) — проверка только через бэк
(канон user: фронт = интерфейс).

Паттерн = **library-блоки 1-в-1** (эталон): singleton-store `createStore`
(НЕ XState — прецедент library), api.ts с явным apiBase, connected-блоки,
события через `useEmitOptional`, phantom `__events`.

# Scope (packages/web/learn)

1. **`lessons/store.ts`** — singleton: `lessons[] / selectedId / current
   (полный урок) / loading`; `loadList(apiBase)`, `open(apiBase, id)`
   (fetch урока), `close()`. Плюс состояние дрилла: `answers/verdicts`
   per item (эфемерно, не персистим).
2. **`lessons/api.ts`** — fetch list/lesson/check (`${apiBase}/learn/…`,
   образец library/api.ts). apiBase — из `core/apiContext` в блоках
   (useApiBase), в api-функции параметром.
3. **Блоки** (регистрация `Learn.Lessons.{List,View}` в capsule.ts, nested
   как Library):
   - **List** — уроки (title, level-бейдж, tags), lazy-load на mount,
     клик → `open` + emit `onLessonSelect { id }`;
   - **View** — выбранный урок: intro → маршрут по порядку: концепт(ы) —
     проза; правило(а) — справочник; дрилл(ы) — интерактив;
   - **дрилл-интерактив** (внутренний компонент View, отдельно НЕ
     регистрировать): promptRu (+context если есть) → Input + «Проверить» →
     check → ✅ / хинт (near_miss) / «мимо» (wrong); «Показать ответ» =
     reveal; словам дрилла (words_resolved) — 🔊 через emit `onSpeak
     { audioUrl }` (существующий канал library).
4. **Markdown-рендер** тел концептов/правил (там таблицы!): переиспользовать
   существующую механику web-docs (как studio Info рендерит README). Если она
   не переиспользуется чисто (тянет корни/не экспортирована) — **STOP +
   surface architect'у** (будет мини-бриф), НЕ вставлять сырой текст и НЕ
   тащить новый markdown-dep без согласования.
5. **Старые скелеты `lesson/`** (LessonView/Concept/CodeBlock/TypeError,
   iter-1 плейсхолдеры): что не переиспользуется — снести (прецедент
   WordExplorer), регистрацию/экспорты подчистить.
6. **Тесты** (мок fetch): store list/open; List рендер+клик; View порядок
   маршрута сохранён; дрилл-флоу — correct/near_miss(хинт виден)/wrong/reveal;
   emit'ы.

# Acceptance

`pnpm --filter @capsuletech/web-learn test|build` зелёные; biome 0; OWNERSHIP
публичный API обновлён. Live-проверка — на стороне apps-брифа (после mount).

# Что НЕ делаем

- Страницы аппа (бриф apps следом), персист прогресса (фаза 3),
  LLM-фидбек, SentenceBuilder-переделку.
