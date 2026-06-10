---
tags: [meta, design-system, review, finish, pre-pr]
updated: 2026-06-09
owner: design (design-owner ревью)
status: pre-pr-punchlist
---

# Ревью finish/ambient — причесать ПЕРЕД PR

> Ревью design-owner'а реализации finish-мода + ambient + FinishEditor. **Временный punch-list** — отработать пункты, потом можно удалить. Это НЕ переделка: качество высокое, канонично, костылей нет.

> [!done] СТАТУС 2026-06-09: **все пункты #1–#6 отработаны** (uncommitted, ждёт PR). #6 (root-фикс `--color-accent` → сырые theme-vars) применён в createFinish/widget-frame/applyAmbient; конвенция задокументирована в `docs/_meta/design-tokens.md` (секция «Colors — `--color-*` vs raw theme-vars»). Тесты green: web-style 142 / web-ui 331 (+3 skip) / web-shell 261. Браузер: фон рендерится с accent-подсветками (сырой `var(--accent)`).

## ✅ Что хорошо (не трогать)

- Хук `createFinish` (`web-ui/lib`) читает **сигнал** `useFinishMode()` из web-style → верное направление зависимости, без cycle, без DOM-walk/ref-тайминга.
- Только **существующие токены** через `color-mix` → freeze-safe, тинт следует теме.
- Один флоу: `setFinishMode` синхронит сигнал (JS-поверхности) + `data-finish` (CSS ambient `html[data-finish] body::before`).
- `ModeToggle` → декларативный `MODES`-рекорд; `Slider` на Kobalte; редакторы — connected config-driven Shell-контролы; no-op при OFF.
- **Тесты зелёные:** web-style 142 / web-ui 331 (+3 skip) / web-shell 261.

## 🟡 Must-fix перед PR

### 1. Stale JSDoc (комментарии врут о механизме)
В трёх местах комментарий «Finish effect: activated by `[data-finish]` on any ancestor … found via `closest()` … Ref must be a reactive signal» описывает **СТАРЫЙ удалённый** DOM-walk-механизм. Код уже читает **сигнал** (`createFinish()` → `useFinishMode()`). Переписать:
- `packages/web/ui/src/primitives/dropdown/dropdown.tsx` — `Content` и `SubContent`.
- `packages/web/ui/src/primitives/select/select.tsx` — `Content`.

Правильная формулировка: *«Finish surface activates via the reactive `useFinishMode()` signal (read inside `createFinish`); no DOM walk / `closest()` / ref needed. (`data-finish` на `<html>` отдельно драйвит CSS ambient-слой, но surface-финиш здесь — signal-driven.)»*

### 2. Неконсистентный порядок мерджа стилей
- `card.tsx`, `widget-frame.tsx`: `{ ...base, ...finish.surfaceStyle() }` → **finish последним, finish выигрывает.**
- `dropdown.tsx` Content/SubContent: `{ ...finish.surfaceStyle(), ...consumerStyle }` → **finish первым, consumer выигрывает.** ⚠️ расходится.
- `select.tsx` Content: только `finish.surfaceStyle()` (consumer style не мерджится вовсе).

**Привести к ОДНОЙ конвенции — рекомендую finish-wins везде** (мод включён → эффект применяется; consumer-override редок): в dropdown поменять на `{ ...consumerStyle, ...finish.surfaceStyle() }`; в select — тоже мерджить consumer style (если он в API) тем же порядком. Если есть причина оставить иначе — задокументировать в комментарии.

### 6. Инлайн-стили — на СЫРЫЕ theme-vars (root-фикс `--color-accent`)
**Корень (агент подтвердил эмпирически):** `--color-*` (Tailwind `@theme inline`) НЕ гарантированы как `:root`-переменные — эмиссия зависит от usage/tree-shake (`--color-accent` реально пуст). Поэтому `var(--color-X)` в **инлайн-стилях** хрупок. Сырые `--primary`/`--accent`/`--card`/`--foreground` (в `[data-theme]`) — эмитятся всегда.

**Решение (Option A, design-owner): инлайн-стили читают СЫРЫЕ vars, `--color-*` — только для utility-классов.**
- `createFinish` (web-ui/lib): `var(--color-foreground/card/primary)` → `var(--foreground/card/primary)`.
- `applyAmbient` (web-style/switcher/ambientConfig): `var(--color-${tint})` → `var(--${tint})`, **фоллбэк УБРАТЬ** (не нужен).
- `widget-frame` (web-ui): `var(--color-card/ring/border)` → `var(--card/ring/border)` (сейчас работает «по везению», приводим к конвенции).
- **Конвенция в `docs/_meta/design-tokens.md`** (новая короткая заметка): «JS/инлайн-стили и градиенты → сырые theme-vars (`--primary`/`--accent`/`--card`…). `--color-*` → только utility-классы; как `:root`-vars НЕ гарантированы.»
- Freeze-safe: канон-набор не трогаем, меняем только какую переменную читает инлайн-стиль. НЕ форсим эмиссию `--color-*` (Option B отклонён — дубль-слой, бой с Tailwind).
- **НЕ заводить отдельный follow-up** «почему accent не эмитится» — это ожидаемое поведение Tailwind, Option A его обходит.
- **Проверка:** браузер deepPurple + zen + dark — и primary, и accent тинты рендерятся (раньше accent пустой).

## 🟢 Nice-to-fix (полиш, по желанию)

3. `finishSettings.tsx` — standalone-триггер хардкодит длинный className кнопки. Заменить на `<Dropdown.Trigger as={Button} variant="outline" size="sm">` ([[use-ui-kit-everywhere]]).
4. `switcher/index.ts` — header-коммент перечисляет только `useTheme/useDarkMode/useResizeMode/useDndMode`; добавить finish/ambient/settings сторы.
5. ~~`ambientConfig.ts` коммент про `--color-accent`~~ → **ПЕРЕСМОТРЕНО (стало must-fix #6).** Агент эмпирически подтвердил: `--color-accent` реально НЕ эмитится на `:root` (Tailwind v4 `@theme inline` + tree-shake — эмиссия `--color-*` зависит от usage). Коммент был ВЕРНЫМ, фоллбэк load-bearing. Решение — см. #6.

## 🔁 Переиспользуемость (контекст)

- Настройки **переиспользуемы**: store-backed (`useFinishConfig`/`setFinishConfig`/`reset…`, аналогично ambient), реактивно, persist. Хук и любой UI их читают/правят централизованно — не хардкод по компонентам. ✅
- **Не в этой PR (следующий шаг):** экспорт/импорт **именованных пресетов** (отдать тюнинг другому app/тенанту как JSON). Сейчас только `DEFAULT_*_CONFIG` (едет с пакетом) + локальные правки. Дистрибуция пресетов сходится с треком **theme-JSON / skin-дельта** — отдельно.

## ✅ Перед PR

- Тесты green по web-ui / web-style / web-shell (уже зелёные — перепроверить после правок).
- `typecheck` (CI-гейт): `nx run-many -t typecheck` по затронутым пакетам.
- Браузер: finish ON/OFF на deepPurple/zen/black, ambient-фон, редактор-крутилки (подтверждено).

## 🧹 PR-гигиена (КРИТИЧНО)

- В рабочем дереве лежит **несвязанный WIP пользователя** → коммитить **ТОЛЬКО finish/ambient файлы по явным путям**. **НИКОГДА `git add -A`/`git add .`**.
- Затронутые зоны: `web-ui` (lib/finish, card, dropdown, select, widget-frame, slider), `web-style` (switcher: finishMode/finishConfig/ambientConfig + index, index.css), `web-shell` (modeToggle, finishSettings, appearance/backgroundSettings, appearance).
- Рефактор `ModeToggle` (bespoke → MODES) затронул существующие тоглы — тесты покрывают, регрессий нет, но это часть диффа: описать в PR-body.
