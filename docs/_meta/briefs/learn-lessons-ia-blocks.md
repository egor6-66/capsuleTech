---
title: web-learn — ИА раздела Lessons iter 1: вкладки Концепты/Правила, правило-с-дриллами, Prose-типографика
status: ready ПОСЛЕ learn-concepts-rules-compose.md и ui-prose-primitive.md (rebuild dist обоих)
audience: owner-сессия `claude-scope -Scope learn` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [032, 033, 069]
---

# Контекст (решение user)

Текущий Lessons.View — простыня (философия+справочник+тесты подряд) = каша.
Новая ИА: вкладки **Концепты** (библиотека прозы) и **Правила** (справочник;
у правила внизу ЕГО дриллы). Уроки-маршруты (текущие List/View) — с раздела
СНИМАЮТСЯ до накопления контента (блоки в пакете живут, регистрация остаётся —
вернём вкладкой позже).

# Scope (packages/web/learn)

1. **`lessons/Nav.tsx`** — под-навигация раздела (зеркало library/Navigation:
   сегменты `concepts | rules`, emit `onLessonsNavigate { segment }`), рег
   `Learn.LessonsNav` (плоский ключ, как LibraryNav).
2. **Концепты**: `Learn.Lessons.Concepts` (список: title+principle, клик →
   store.openConcept) и `Learn.Lessons.Concept` (статья: body через
   Markdown→**обернуть в `Prose` из web-ui**). Либо список+деталь одним
   блоком с внутренним стейтом — на вкус owner'а, но регистрация ≤2 ключей.
3. **Правила**: `Learn.Lessons.Rules` (список) и `Learn.Lessons.Rule`
   (тело в Prose + секция «Практика»: дриллы правила — переиспользовать
   СУЩЕСТВУЮЩИЙ `Drill.tsx` как есть: чекер глобален).
4. **store**: расширить lessonsStore (concepts/rules списки+текущий,
   fetch с `/learn/concepts|rules`); drill-стейт уже есть.
5. **Markdown.tsx** — рендер оборачивается в `Prose` (web-ui), собственных
   стилей не добавлять.
6. Тесты: списки/деталь обоих вкладок, правило-с-дриллами (мок), Prose-обёртка
   присутствует. Старые тесты List/View урока НЕ удалять (блоки остаются).

# Acceptance

test/build/biome зелёные; dist пересобран; OWNERSHIP обновлён.
