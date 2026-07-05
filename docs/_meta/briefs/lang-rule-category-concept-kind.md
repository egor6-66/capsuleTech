---
title: backend/lang — поля группировки: rule.category/order + concept.kind/order (аккордеон-ИА)
status: ready (одной сессией с lang-tense-validator-finalochka-semantics.md — оба ждут)
audience: owner-сессия `claude-scope -Scope backend-lang` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [069]
---

# Контекст

Предложение учителя принято (accordion-grouping-for-architect.md): разбивка =
данные во frontmatter, апп только группирует. Ru-подписи/порядок ГРУПП — на
фронте, здесь только поля.

# Scope (backend/lang)

1. Миграция: `rules.category` (enum: phonetics|grammar|speech, native_enum=False)
   + `rules.sort_order` int (default 100); `concepts.kind` (enum:
   approach|pattern|recommendation) + `concepts.sort_order`. Backfill дефолтами
   (category='grammar' server_default — реальные значения приедут реимпортом).
2. Importer: читает `category/order` (rule) и `kind/order` (concept);
   отсутствие поля — ДОПУСТИМО (дефолты: rule category по ПАПКЕ vault —
   grammar/→grammar, phonetics/→phonetics, speech/→speech; concept kind →
   'approach'; order → 100); unknown значение enum — reject с понятной ошибкой.
3. API: списки `/lang/rules` и `/lang/concepts` отдают поля; сортировка:
   category|kind → sort_order → title.
4. Тесты: enum-валидация (unknown reject), дефолт category-из-папки, сортировка.
5. После (вместе с tense-валидатором): полный `vault_import` — отчёт в коммит
   (учитель к этому моменту проставит поля по своей стартовой раскладке).

# Что НЕ делаем
Ru-подписи групп (фронт), «trap»-kind (заведём аддитивно с первым контентом).
