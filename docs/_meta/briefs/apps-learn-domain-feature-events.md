---
title: apps/learn — доменные события пакета из root App → features/library (канон app-фичи)
status: ready
audience: owner-сессия `claude-scope -Scope apps` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [032]
---

# Контекст (канон user 2026-07-04, память feedback_app_feature_scopes)

Root `Features.App` = ТОЛЬКО глобальные концерны аппа. Доменные события пакета
ловит доменная фича аппа. Сейчас в `apps/learn/src/features/app.tsx` осело
`onLibraryNavigate` (доменная под-навигация библиотеки) — нарушение.

# Scope (только apps/learn)

1. Создать `src/features/library.tsx` — тонкая доменная фича библиотеки:
   ловит `Learn.LibraryNav.Events` (`onLibraryNavigate` → `router.goTo('/library/…')`).
2. Смонтировать её обёрткой над library-поддеревом: `pages/_workspace/library/index.tsx`
   (layout-страница) оборачивает своё содержимое в `<Features.Library>` — сток
   баблинга для LibraryNav и будущих library-событий.
3. Из `features/app.tsx` удалить `onLibraryNavigate` (+ его тип из дженерика).
4. НЕ трогать: `onNavigate` (глобальная навигация разделов), `onPick` (движок,
   app-wide настройка), `onSpeak` (плеер = app-глобальный концерн озвучки,
   решение architect — остаётся в App).

# Acceptance

- `capsule build` чист; biome 0.
- Живой клик по подразделам библиотеки (`:8080/learn/library` → Explorer/Collections)
  роутит как раньше.
