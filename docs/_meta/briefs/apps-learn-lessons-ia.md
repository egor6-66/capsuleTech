---
title: apps/learn — страницы Lessons iter 1: под-нав + Концепты/Правила (уроки-маршруты сняты до накопления)
status: ready ПОСЛЕ learn-lessons-ia-blocks.md (rebuild dist web-learn + dev --force)
audience: owner-сессия `claude-scope -Scope apps` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [032, 069]
---

# Scope (только apps/learn)

Зеркало library-механики (layout с под-навом + под-страницы):

1. `pages/_workspace/lessons/index.tsx` (layout): header-слот =
   `<Widgets.Navigation><Learn.LessonsNav/></Widgets.Navigation>`, main = Outlet.
2. Под-страницы: `lessons/concepts.tsx` → `Learn.Lessons.Concepts` (+Concept —
   как пакет отдаст: рядом/встроенно), `lessons/rules.tsx` →
   `Learn.Lessons.Rules` (+Rule). `_index` → редирект/дефолт на concepts
   (как library _index → explorer-паттерн).
3. Текущий mount уроков-маршрутов (`Learn.Lessons.List/View` из `_index`) —
   УБРАТЬ (вернём вкладкой «Уроки», когда учитель накопит; блоки в пакете живут).
4. `features/lessons.tsx`: + `onLessonsNavigate` → `router.goTo('/lessons/<segment>')`
   (зеркало onLibraryNavigate в Features.Library).

# Acceptance

build+biome 0; live `:8080/learn/lessons`: вкладки Концепты/Правила; концепт
word-as-image читается КАК ДОКУМЕНТ (типографика Prose, не каша);
grammar-pronouns: текст правила с таблицами + внизу дрилл с проверкой/хинтами;
🔊 на словах дрилла играет.
