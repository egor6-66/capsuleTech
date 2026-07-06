# Бриф: web-moderator — bootstrap + канон-под-тест + POC-гейт (Milestone 0)

**Зона:** owner-moderator (`claude-scope -Scope moderator`, `packages/web/workspace/moderator/`). Scope-тег `moderator`, **НЕ пушить**.

**Пререквизит:** бриф `web-core-wrappers-barrel.md` смержен (нужен субпат `@capsuletech/web-core/wrappers`). Без него POC не соберётся.

**Что уже есть (architect):** `project.json` (fence) + пути в `tsconfig.base.json` (`@capsuletech/web-moderator` + `/capsule`). Остальное создаёшь ты.

---

## 🎯 Зачем этот пакет — ДВЕ роли

1. Доменный пакет **модерации контента** (редакторы по типу контента; mirror архитектуры learn, домен — валидация/модерация).
2. **Testbed нового канона авторинга пакетов** (арх-решение user 2026-07-06). На нём обкатываем модель ДО того, как трогать learn/studio (там много всего, side-effect'ы).

**Каноничность важнее оверхэда** (прямое решение user). Не срезай углы «чтобы проще».

## Канон-под-тест: «доменный пакет = апп минус Page/Feature»

Пакет авторится теми же HCA-обёртками, что апп. Граница апп↔пакет — только структурная.

- **Слои-папки как в аппе:** `entities/ views/ shapes/ widgets/ controllers/` + `core/`. **НЕТ `pages/` и `features/`** (app-only).
- **Обёртки — из `@capsuletech/web-core/wrappers`** (узкий authoring-barrel; `Page`/`Feature` там отсутствуют — структурный enforce). НЕ из главного barrel, НЕ глобалы (в пакете глобалов нет).
- **`Entity` — РЕАЛЬНАЯ обёртка** `Entity(({ zod }) => ({ schema, defaults? }))`, zod из `@capsuletech/shared-zod`. Не plain-интерфейсы (в отличие от нынешнего learn — тот подтянем позже).
- **Интерактивные `View`/`Widget` получают проксированный `Ui`** (первый аргумент обёртки) → тег-флоу:
  - инпуты несут **базовые семантические теги** от смысла (`<Ui.Input meta={{ tags: ['search'] }}/>` для поиска);
  - событие всплывает в app-Feature **по тегу** (как нативный app-компонент), апп может перемапить через `aliases`;
  - пакет теги **не навязывает** — это дефолты.
- **`useEmit`/именованные события — ТОЛЬКО для типизированной семантики** (`onImport { payload }`, `onValidateError`), не на каждый клик. Обычный UI-флоу идёт тегами.
- **Chrome/стили — из web-ui пресетами**, ноль raw-классов ([[feedback_primitives_props_only_no_raw_classes]]).

## Шаг A. Bootstrap (создай файлы)

- **`package.json`** — name `@capsuletech/web-moderator`, version `0.0.0`, exports `.`+`./capsule` (образец — `packages/web/workspace/studio/package.json`). deps: `web-core`, `web-ui`, `web-style`, `web-shell`, `web-placeholders`, `shared-zod` (все `workspace:*`); peer `solid-js ^1.9.12`; dev: `lib-builder`, `vite-builder`, `@testing-library/jest-dom`, `jsdom`, `vite-plugin-solid`.
- **`tsconfig.json`** — `{ "extends": "../../../../tsconfig.base.json", "include": ["src", "vite.config.mts"] }`.
- **`vite.config.mts`** — `libConfig({ entry: { index: 'src/index.ts', capsule: 'src/capsule.tsx' }, name: 'CapsuleWebModerator' })`.
- **`vitest.config.ts`** — по образцу studio (jsdom env).
- **`src/capsule.tsx`** — `defineCapsuleModule({ name: 'Moderator', components: { ... } })` (из `@capsuletech/web-core/module`).
- **`src/index.ts`** — barrel (`export * from './core'` когда появится).
- **`OWNERSHIP.md`** — `zone: workspace`, `status: scaffold`, секция «🧪 Arch-under-test» (перепиши канон выше).

После создания `package.json` → попроси architect'а прогнать `pnpm install` (релинк workspace).

## Шаг B. 🚩 Milestone 0 — POC тег-флоу (ГЕЙТ, отчитаться ДО сборки остального)

**Вопрос POC:** получает ли пакет-авторская `View` проксированный `Ui`, и всплывает ли тегированный инпут в ближайший Controller/Feature по тегу?

Сделай **минимальный вертикальный срез**:
1. `views/search.tsx` — `View((Ui) => <Ui.Input meta={{ tags: ['search'] }} placeholder="…" />)` (обёртка `View` из `@capsuletech/web-core/wrappers`).
2. Зарегистрируй в `capsule.tsx` (`Moderator.Search`) — проверь, что registry-codegen поднимает.
3. **Тест `views/__tests__/search.tag-flow.test.tsx`** (vitest+jsdom): отрендери `Moderator.Search` ВНУТРИ тест-Controller/Feature с хендлером `onInput`, который фильтрует по тегу `search`; сфаери input-событие; **ассерт: хендлер получил target с тегом `search`**. Если в web-core есть тест-утилита «render-under-controller» — используй её; иначе собери минимальный ControllerContext-харнесс (посмотри как это делают тесты web-core `engine/`).

**Результат гейта:**
- ✅ **Зелёный** (хендлер поймал тег) → канон подтверждён, отчитайся architect'у — дам бриф на сборку реального moderator'а.
- ❌ **Красный** (проксирование/тег-флоу не работает для пакет-View) → **СТОП, не костыляй**. Отчитайся с конкретикой (что именно не сработало: Ui не проксирован / событие не всплыло / codegen не поднял) → эскалация owner-web-core (движок надо доработать под пакет-авторские Views). Это ровно то, ради чего POC на greenfield.

> Живой браузер-прогон (в аппе) — потом, за architect/user; на этом шаге достаточно vitest-доказательства механики.

## Verify (Milestone 0)
- `pnpm --filter @capsuletech/web-moderator test` + `:typecheck` + `:build` — зелёные.
- Тег-флоу тест зелёный ЛИБО чёткий отчёт о красном с диагнозом.

Отчёт architect'у: созданные файлы, результат POC (зелёный/красный + детали), хвост test/typecheck/build. **НЕ строй entities/shapes/widgets/controllers, пока POC не подтверждён и не получишь build-бриф.**

## Готово (Milestone 0) =
пакет собирается; один `View` с тегом зарегистрирован; POC-тест даёт однозначный вердикт по тег-флоу; отчёт architect'у для решения о сборке.
