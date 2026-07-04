---
title: web-learn — снос осиротевшего скелета WordExplorer (заменён блоками Library.*)
status: ready
audience: owner-сессия `claude-scope -Scope learn` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [055]
---

# Контекст

Iter-1 скелет `library/WordExplorer.tsx` (stateless плейсхолдер «поиск+карточка»)
полностью заменён живыми блоками `Learn.Library.{Search,Words,Info}`
(миграция `learn-library-block-migration.md`). В app больше не используется
(страница explorer монтирует блоки), но остался экспортирован, зарегистрирован
как `Learn.WordExplorer` и покрыт smoke-тестом — мёртвый вес.

**ВАЖНО — канон-разворот 2026-07-04 (user):** `packages/web/learn` теперь ЭТАЛОН
анатомии domain-пакета. `core/`-вложенность (provider+контексты) — канон,
НЕ переименовывать в `providers/`. Studio будут подводить под learn отдельной
волной. Ничего в раскладке пакета не менять, только снос сироты.

# Scope (только packages/web/learn)

1. Удалить `src/library/WordExplorer.tsx`.
2. `src/library/index.ts` — убрать экспорт `WordExplorer` / `IWordExplorerProps`.
3. `src/capsule.ts` — убрать импорт и ключ `WordExplorer` из `components`
   (+ строку из doc-коммента со списком глобалов).
4. `src/__tests__/smoke.test.tsx` — убрать импорт и тест `WordExplorer renders`.
5. `OWNERSHIP.md` — вычеркнуть `Learn.WordExplorer` из публичного API, если упомянут.

# Что НЕ делаем

- НЕ трогаем `Collections`/`VocabList`/`LibraryWelcome`/`Navigation`/`BookmarkButton` —
  используются страницами app (`/library/collections`, `/library` _index, LibraryNav).
- НЕ трогаем `core/`, `controllers/`, блоки `Search/Words/Info/WordTile/store/api/types`.

# Acceptance

- `pnpm --filter @capsuletech/web-learn test` зелёные (было 22 + smoke; станет на 1 меньше).
- `pnpm --filter @capsuletech/web-learn build` чист.
- `pnpm exec biome check packages/web/learn` 0 ошибок.
- `Grep WordExplorer` по repo → 0 вхождений (кроме истории/брифов).
