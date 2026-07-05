---
title: apps/learn — Lessons iter 2: deep-link роуты + трёхколоночная раскладка (как студия)
status: ready ПОСЛЕ learn-lessons-three-pane.md (rebuild dist web-learn + dev --force)
audience: owner-сессия `./claude-scope.sh apps-learn` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [032, 069]
---

# Scope (только apps/learn)

1. **Роуты** (URL = источник истины выбора):
   - `lessons/rules/$ruleId.tsx` и `lessons/concepts/$conceptId.tsx`
     (dynamic-сегменты TanStack; param пропом в блоки);
   - `lessons/rules/index.tsx` → без выбора (аккордеон + подсказка «выбери
     тему» — Placeholders/plain — по вкусу); `lessons/concepts/index.tsx`
     аналогично; `lessons/_index` → редирект на concepts (как было).
   - Легаси hash-ссылки (`#id`) НЕ поддерживаем — канон path.
2. **Раскладка**:
   - rules/$ruleId: `Layouts.Matrix` три слота как студия — left =
     `Learn.Lessons.Rules` (аккордеон, activeId=param), main =
     `Learn.Lessons.Rule id=…`, rightBar = `Learn.Lessons.RuleDrills id=…`;
   - concepts/$conceptId: две колонки (left аккордеон + main Concept).
3. **Фича lessons** (доменная): `onRuleSelect → router.goTo('/lessons/rules/'+id)`,
   `onConceptSelect → router.goTo('/lessons/concepts/'+id)` — единственная
   логика; события приходят и из аккордеонов, и из wikilinks/чипов (пакет
   эмитит одинаково — фиче всё равно, откуда).
4. Под-нав LessonsNav остаётся (переключение вкладок разделов).

# Acceptance
build+biome 0; live `:8080/learn/lessons` (свежие dist + dev --force):
- прямой заход по URL `/learn/lessons/rules/grammar-pronouns` открывает
  правило с аккордеоном слева (группа раскрыта) и дриллами справа;
- клик в аккордеоне меняет URL; F5 сохраняет место;
- в концепте «оси…» (когда учитель доложит) wikilink/чип ведёт в правило;
- дриллы в rightBar работают (проверка/хинты/🔊).
