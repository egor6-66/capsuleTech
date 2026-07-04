---
title: apps/learn (+playground) — снять raw-class строку из shellNavigation (Button теперь умеет сам)
status: ready (Button aria-current в ветке — 3261121a; пересобрать dist web-ui перед verify)
audience: owner-сессия `claude-scope -Scope apps` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: []
---

# Scope

Button красит активную nav-ссылку сам по `aria-current="page"` (ставит router
Link) — базовый CVA, ноль пропсов у потребителя.

1. `apps/learn/src/shapes/shellNavigation.tsx`: удалить `class: 'aria-[current=page]:…'`
   из item.props целиком.
2. Зеркальная навигация playground: найти аналогичную строку (если есть) — снять
   там же тем же коммитом.
3. Больше НИЧЕГО: никаких новых пропсов, поведение уже в kit'е.

# Acceptance

build+biome 0; глазами `:8080/learn/`: активный раздел подсвечен как раньше,
клик по текущему разделу мёртв (pointer-events гасится kit'ом).
