---
title: web-learn — Lessons iter 2: аккордеоны-группы, id-пропы (URL-driven), сплит Rule/RuleDrills, wikilink-переходы
status: ready ПОСЛЕ lang-rule-category-concept-kind + docs-callouts + ui-prose-callouts (rebuild dist всех)
audience: owner-сессия `claude-scope -Scope learn` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [032, 069]
---

# Контекст (решения user)

1. Выбор темы должен жить в URL (deep-links) — блоки получают `id` ПРОПОМ,
   селект-клик = событие наверх (апп роутит). Store остаётся данными/кэшем.
2. Раскладка «как студия»: слева аккордеон, центр — контент, справа — практика
   → дрилл-секция выделяется отдельным блоком.
3. Аккордеон = kit `Ui.Accordion`, паттерн studio-палитры (тот же примитив).
4. Кросс-навигация: wikilinks в теле + чипы relatedRules у концепта.

# Scope (packages/web/learn, lessons/)

1. **Rules-аккордеон** (`Learn.Lessons.Rules`): группы по `category` из API
   (ru-маппинг подписей + порядок групп + подзаголовок-строка — константа в
   блоке: Фонетика/Грамматика/Речь), внутри — по sort_order. Свёрнут по
   умолчанию (lookup), кроме группы активного `id`. Клик → emit
   `onRuleSelect { id }` (НЕ store-селект).
2. **Concepts-аккордеон** (`Learn.Lessons.Concepts`): группы по `kind`
   (Подход/Паттерн/Рекомендация + подзаголовки), РАЗВЁРНУТ по умолчанию
   (маршрут чтения). Клик → emit `onConceptSelect { id }`.
3. **`Learn.Lessons.Rule`** — контент по пропу `id` (fetch через store-кэш):
   Prose-тело со **срезанным ведущим H1** (он = title по построению),
   title рендерим сами. БЕЗ дриллов (уехали в п.4).
4. **`Learn.Lessons.RuleDrills`** — практика правила по пропу `id`
   (существующий Drill-компонент, данные из rule-композиции — не дублировать
   fetch: store кэширует правило целиком, оба блока читают его).
5. **`Learn.Lessons.Concept`** — по пропу `id`: Prose-тело (strip-H1) + чипы
   `relatedRules` («Смотри правила») → клик = emit `onRuleSelect { id }`.
6. **Wikilink-переходы**: делегированный click-handler на Prose-контейнере
   (`a.wikilink[data-ref]`): ref ищется в загруженных списках rules/concepts →
   emit onRuleSelect|onConceptSelect; неизвестный ref → console.warn, no-op.
7. Store: `open*` по пропу (реакция на смену id), кэш правил/концептов;
   МИГРАЦИЯ: прежний внутренний селект-стейт удалить.
8. Тесты: группировка/порядок/подписи; expanded-политики; emit'ы (селект,
   relatedRules-чип, wikilink, unknown-ref no-op); strip-H1; RuleDrills
   переиспользует кэш (один fetch на правило).

# Acceptance
test/build/biome зелёные; dist пересобран; OWNERSHIP обновлён.
