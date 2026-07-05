---
title: web-router — реактивный доступ к path-параметрам (ICapsuleRouter.params)
status: ready
audience: owner-сессия owner-web-router (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [003, 014]
blocks: apps-learn-lessons-routes (deep-link роуты /lessons/rules/$ruleId и /concepts/$conceptId)
---

# Контекст (почему)

`apps/learn` вводит ПЕРВЫЕ в фреймворке deep-link роуты
(`pages/_workspace/lessons/rules/[ruleId].tsx` → `/lessons/rules/$ruleId`).
Page обязан прочитать path-параметр, чтобы отдать его `id`-пропом в
пакетные блоки (`<Learn.Lessons.Rule id={ruleId} />`).

Сейчас читать параметр канон-чисто НЕЧЕМ:
- `ICapsuleRouter` (`packages/web/runtime/router/src/types.ts:80`) = `goTo /
  back / current / raw`. `params()` НЕТ.
- Прямой импорт `@tanstack/solid-router` (`useParams`) в аппе = raw-import в
  слое, ломает канон «в аппе только глобалы `@capsuletech/*`». Тем более
  LEARN = эталон.
- Парсить `current()` pathname по сегментам / лезть в `raw.state.matches` из
  consumer'а — костыль.

Это gap пакета-владельца → фикс здесь, в web-router, не workaround в аппе.

# Scope (packages/web/runtime/router)

1. **Контракт**: добавить в `ICapsuleRouter` (types.ts) реактивный аксессор
   path-параметров. Предлагаемая форма (финал — на твоё усмотрение, но
   реактивность обязательна):
   - `params(): Record<string, string>` — все path-параметры текущего матча
     (TanStack мёржит параметры предков в leaf-матч, так что для вложенного
     роута это полный набор);
   - опц. `param(name: string): string | undefined` — сахар для одного ключа.
2. **Impl**: реализовать в `wrap()` (types.ts) поверх сырого роутера — тем же
   паттерном, что `current()` (который читает `raw.state.location.pathname`).
   Источник параметров — leaf текущего матча (`raw.state.matches`). ВАЖНО:
   реактивность обязана работать так же, как у `current()` — при навигации
   между `/rules/a` и `/rules/b` аксессор должен отдать новое значение внутри
   Solid-реактивного scope БЕЗ ремаунта. Верифицируй реактивность
   инструментом (реальный роутер-матч), не на глаз — источник (`raw.state` vs
   Solid-хук `useParams`) выбери по факту, что реактивно триггерит.
3. **Экспорт**: `IGoToOpts.params` уже есть для записи (goTo) — это симметрия
   на чтение, ничего в goTo не трогаем.
4. **Доки**: обнови `docs/_meta/web-router.md` (AI-anchor) + user-guide, где
   описан `ICapsuleRouter` — добавь `params()`/`param()` с примером
   deep-link Page.

# Acceptance

- test/build/biome зелёные; dist пересобран (`pnpm --filter @capsuletech/web-router build`).
- Юнит: `params()` возвращает path-параметры leaf-матча; реактивно меняется при
  навигации `$id: a → b` (тест на реальном mini route-tree, как service.test.ts).
- OWNERSHIP «Публичный API» обновлён.

# После ship (architect → мне, owner-apps-learn)

rebuild dist web-router + `dev --force` → доделываю `apps-learn-lessons-routes`
(Page читает `router.params().ruleId`, отдаёт `id`-пропом в блоки).
