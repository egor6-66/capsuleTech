# Brief — owner-studio: студия владеет канвасом (remote-embed + внутренняя связка)

**Зона:** `packages/web/studio/` (scope `web-studio`).
**Итерация:** universal-canvas iter 4 — миграция канваса из app в студию (deferred-план).
**Тип:** арх-шаг — студия получает зависимость на web-remote и встраивает канвас сама. Контекст ниже обязателен.

## Зачем / целевая форма

Сейчас remote-embed канваса + связка «палитра→канвас» живут в **аппе** (playground): страница монтит `<Remote.Provider>`, `Features.Canvas` (app) ловит `onPresetSelect` палитры и шлёт `setComposition` в канвас. Канал отлажен и browser-verified.

Теперь втягиваем это **внутрь студии**, чтобы будущие внутренние механики (composition-сборка, preset-settings) жили в студии, а не в аппе. Канон (подтверждён user'ом): **вся логика студии — внутри студии**; апп ловит только конкретные именованные события, которые студия эмитит наверх.

После миграции апп-страница схлопывается до `<WebStudio.Provider canvasUrl="...">`, апп НЕ знает про remote-механику — только координату.

## Что сделать

### 1. Зависимость
`package.json` → `dependencies`: `@capsuletech/web-remote: "workspace:*"`.

### 2. `WebStudio.Provider` — монтит Remote + держит внутреннюю связку

`providers/StudioProvider.tsx` сейчас = только `<DnDProvider>`. Расширить:
- принять проп **`canvasUrl: string`** (+ опц. `canvasName?: string`, дефолт `'universal-canvas'`);
- внутри обернуть детей в `<Remote.Provider modules={[{ name: canvasName, url: canvasUrl }]}>` (поверх существующего `<DnDProvider>`);
- **внутренняя логика-связка** садится здесь же (Provider обнимает весь фрейм палитра+канвас → он сток баблинга `onPresetSelect`, и у него remote-контекст). Реализация — внутренний студийный логик-враппер (Feature/Controller на твой выбор), который:
  - ловит `onPresetSelect` (эмитит палитра, payload `{ schema }`) → `useRemote().remote(canvasName, 'main').dispatch('setComposition', { schema })`;
  - структуру внутри студии решаешь сам — главное чтобы враппер был ВЫШЕ и палитры, и канваса (оба под Provider'ом).

> Почему в Provider, а не в `WebStudio.Canvas`: палитра и канвас — соседние слоты Matrix (их раскладывает апп). Ловит тот, кто обнимает обоих — это Provider. Модуль `WebStudio.Canvas` (сосед палитры) её бабблинг не поймает.

### 3. Новый модуль `canvas/` → `WebStudio.Canvas` (тонкий embed)

`<Remote.View name={canvasName} instanceId="main" />` в минимальной обёртке (Flex h/w full). Без логики — логика в Provider (п.2). Это то, что апп кладёт в main-слот Matrix вместо нынешнего `Widgets.Studio.Canvas`.

### 4. Регистрация
`capsule.ts` → добавить `Canvas` в `components` (→ глобал `WebStudio.Canvas`). `WebStudio.Provider` уже зарегистрирован.

## Контракт студия↔канвас (фиксируем)
- студия → канвас: `dispatch('setComposition', { schema })` (contract.in канваса).
- канвас → студия: out-события (`canvasClick` и будущие `nodeSelected`/…) долетают до Provider-враппера (nearest enclosing logic) — студия обрабатывает внутри. Наверх (в апп) студия эмитит **только** осознанные именованные события (в этой итерации — никакие).

## Acceptance (owner, commit-only — НЕ push)
1. `pnpm --filter @capsuletech/web-studio build` + `test` green.
2. `typecheck` green; `biome check --write packages/web/studio`, re-stage.
3. `git commit` scope-тегом, без push. Вернуть last-lines + имя коммита.

## Чего НЕ делать (за architect'ом / след. итерации)
- App-часть (схлопывание страницы, удаление app `Features.Canvas`/`Remote.Provider`/`remotes`) — делает architect.
- Composition-сборка (несколько пресетов → дерево) и preset-settings (инспектор→патч→ре-dispatch) — отдельные итерации.
- Не убирать singleton `selection` (внутренний preview).
