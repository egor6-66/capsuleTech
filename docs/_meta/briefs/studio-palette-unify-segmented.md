# Brief — owner-studio: палитра и узловая мини-палитра = ОДИН сегментированный компонент

> Запуск: `.\claude-scope.ps1 -Scope studio`. Зона — `packages/web/studio/`. Commit-only.
> Перед PR: `pnpm --filter @capsuletech/web-studio test` + `nx typecheck @capsuletech/web-studio` +
> `biome check --write packages/web/studio/src`. Пушит/мержит architect. Это правки в ветку/PR
> **#456** (`feat/studio-creator-tree-iter1`), не новый PR (см. §7).

## Проблема (мандат USER)

Сейчас `tree/NodePalette.tsx` — **отдельный** компонент: плоский список `presetsForNode` + свой
open/close-«дропдаун». Это (1) даёт **дрейф** — новый компонент/пресет в палитре не подхватится в
узле; (2) плоский список нечитаем; (3) вылет не такой плавный, как везде (не kit-Accordion).

**Канон:** палитра и узловая мини-палитра — это **ОДИН компонент**, просто по-разному
сегментированный. Добавили элемент в палитру → он сам появляется в узлах (там где принимается).

## Целевая структура

Общий строительный блок — **сегментированный список** (аккордеон: компонент → его пресеты), уже
живёт в `ComponentsPalette` как `ComponentList`/`ComponentNode`. Вынести его в переиспользуемый
компонент и кормить в двух местах, различая только **источник** (какие компоненты) + **действие**
(что делает клик по пресету) + стили.

### 1. Развязать действие от URL-режима
Убрать из `palette/ComponentsPalette.tsx` ветвление `useStudioMode()` (`Item` → PresetItem vs
DraggablePresetItem). Вместо этого пресет-leaf вызывает **`onSelect(preset)`**, проброшенный
сверху. Потребитель решает действие:
- **store-палитра**: `onSelect = (p) => { loadPreset(p); emit('onPresetSelect', {…}) }` (как сейчас
  в `PresetItem`, только вынести наверх). Подсветка активного = `loadedPresetId() === p.id`.
- **узел**: `onSelect = (p) => insertPreset(p, nodeId)`.

`palette/DraggablePresetItem.tsx` — **удалить** (palette-drag из дизайна ушёл: вставка = клик;
iter 2 reorder-DnD живёт ВНУТРИ дерева, не в палитре). Если позже понадобится — вернётся из git.

### 2. Вынести общий сегмент
Извлечь `ComponentSegments` (переименовать/обобщить текущий `ComponentList` + `ComponentNode` +
`PresetItem`), props:
```
{ manifests: readonly IPrimitiveManifestEntry[];  // что показывать (уже отфильтровано потребителем)
  onSelect: (preset: IPreset) => void;            // действие клика по пресету
  selectedId?: string | null;                     // подсветка активного пресета (store); узлу не нужна
}
```
Рендер: kit `Accordion multiple` → на каждый manifest `Accordion.Item` (компонент) → его
`getPresets(type)` как click-items (`onSelect(p)`). Компоненты без пресетов — как сейчас
(плоская строка без раскрытия) или скрыть (в узле их не будет — фильтр §3 берёт только `hasPresets`).
`PresetItem` становится action-agnostic: `{ p, onSelect, selected? }`.

### 3. store-палитра (`ComponentsPalette`)
Остаётся L1-обёртка «Примитивы | Композиции» (`groupManifests`) → внутрь `<ComponentSegments
manifests={group} onSelect={storeSelect} selectedId={loadedPresetId()}>`. `useDocument`/
`useEmitOptional` вызвать в самом `ComponentsPaletteComponent`, собрать `storeSelect`-замыкание.
Поведение store-режима визуально не меняется.

### 4. Узловая мини-палитра (`tree/NodePalette`)
Переписать через тот же общий блок:
- Обёртка — kit `Accordion` с одним `Item` «＋ добавить компонент» (**плавный вылет**, как везде),
  вместо `createSignal(open)`+`<Show>`.
- Контент — `<ComponentSegments manifests={manifestsForNode(nodeType)} onSelect={onInsert}>`.
- Свои стили под узел дерева (отступ по `depth`, мелкий текст) — стили это ЕДИНСТВЕННОЕ отличие
  от store-палитры. Сохранить `data-testid` (`node-add-*`, `node-preset-*`).
- Пустой accepted-набор → «Нет подходящих компонентов».

### 5. `manifests/rules.ts`
Добавить `manifestsForNode(nodeType)`:
```
getAllManifests().filter(m => hasPresets(m.type) && canAcceptChild(nodeType, m.type))
```
(acceptance на уровне КОМПОНЕНТА — «принят компонент → его пресеты валидны», ровно как в палитре,
где вкладка = компонент с пресетами). `acceptsChildren` — оставить (container-gate в `TreeRow`).
`presetsForNode` — удалить, если после рефактора не используется (проверь тесты).

## 6. Non-goals
- Reorder-DnD внутри дерева — iter 2 (отдельно).
- Никаких изменений в `@capsuletech/web-ui` (accept-policy уже там).
- App-раскладку не трогать (creator/store страницы уже верны).

## 7. Git
Коммит(ы) в **существующую ветку `feat/studio-creator-tree-iter1`** (PR #456 ещё не смержен) —
это доработка той же итерации, не новый PR. Commit-only; architect запушит в ветку.

## 8. Acceptance
- Unit: `ComponentSegments` рендерит manifests + вызывает `onSelect(preset)` по клику; store-палитра
  подсвечивает `loadedPresetId`; `NodePalette` — Accordion-вылет + сегменты + только accepted
  (`manifestsForNode`), клик → `onInsert(preset)`; `manifestsForNode` фильтр корректен. Старые
  palette/tree тесты обновить под новый contract (нет mode-branch, нет DraggablePresetItem).
- Typecheck 0, biome 0.
- Browser (USER, :3050 creator): узел → «＋ добавить компонент» плавно раскрывается → компоненты
  аккордеонами → пресеты; вставка рисует канвас. store — регрессий нет.

## 9. Где лежит
`palette/{ComponentsPalette,groups,DraggablePresetItem}.tsx`, `tree/{TreeRow,NodePalette}.tsx`,
`manifests/rules.ts`, `document.ts` (`loadPreset`/`insertPreset`/`loadedPresetId`).
Общий блок — предлагаю `palette/ComponentSegments.tsx` (экспортить из `palette/index.ts` для
переиспользования в `tree/NodePalette`; cross-module внутри пакета — ок).
