---
title: web-core — Shape: реактивность item.props через batch-шаблон (залипший selected)
status: ready
audience: owner-сессия `claude-scope -Scope core` (commit-only; мы на ветке feat/wave-voice-auth-gateway — коммить в неё)
last_updated: 2026-07-03
adr_refs: [036]
---

# Симптом (learn, Shapes.WordTiles → ui.List batch)

Клик по слову: первый выбранный тайл получает selected и «залипает» — дальнейшие
клики не переносят подсветку (а контент в первом слоте меняется). Правая панель
(WordInfo, отдельный widget) обновляется корректно — стейт (Features.Library
selectedId) живой.

# Что УЖЕ исключено (не переделывать)

- **web-ui чист**: owner-ui запер контракт тестами — List batch И Group batch
  корректно прокидывают изменения `item.props` до целевого item'а
  (`test(ui): lock batch item.props reactivity contract`, commit 649f9c88).
  НО тесты дергают List/Group НАПРЯМУЮ с маппером, читающим signal.
- Данные/стейт чисты (uniq id; SET_DATA — плоский spread).

# Подозрение (диагноз architect — ПРОВЕРИТЬ, не принимать на веру)

`wrappers/shape/wrapper.tsx`, интеграционная цепочка отличается от прямого теста:

1. `getResolvedItem()` оборачивает user-маппер: `fn(it)` → результат прогоняется
   через `resolveValuesInObject(...)` → **новый plain-объект, значения вычислены
   EAGERLY в момент вызова** (снапшот `selected` на момент рендера строки).
2. `mergedExtras = mergeProps(..., () => getResolvedItem() ?? {}, ...)` —
   mergeProps мемоизирует источник; deps мемо = что читает `getRawConfig()`
   ВЕРХНЕГО уровня. Consumer-prop `selectedId` читается ТОЛЬКО внутри маппера
   (лениво) → мемо не пересчитывается → `item` identity стабилен.
3. Итого строка списка получает замороженный снапшот props; обновление доезжает
   только при пересоздании строки (обновление данных), не при смене selectedId.

Пограничный вопрос: в прямом kit-тесте маппер читает signal В МОМЕНТ вызова из
render-effect строки → трекается; через Shape тот же вызов может происходить в
не-тракающем/мемо-скоупе. Найти точное место разрыва трейсом/тестом.

# Требование

Consumer-props Shape (например `selectedId`), читаемые внутри `item.props`-маппера,
обязаны реактивно доезжать до item-компонента batch-шаблона. Фикс — в корне
(Shape wrapper), без пересоздания всех строк на каждый чих и без правок web-ui.

# Регрессионный тест (обязателен, ИНТЕГРАЦИОННЫЙ)

В web-core: Shape two-phase c `as: ui.List` (или мок-шаблон с контрактом List
batch), `item.props: (it) => ({ selected: props.selectedId === it.id })`;
рендер через consumer со signal'ом selectedId; смена сигнала →
data-selected/prop переезжает на целевую строку, со старой снимается,
контент строк не перемешан.

# Acceptance

`pnpm --filter @capsuletech/web-core test` зелёные (новый + старые);
`nx run @capsuletech/web-core:typecheck` ✓; biome по пакету ✓;
`pnpm --filter @capsuletech/web-core build` (dist — консумеры на пребандле).
Изменения только в `packages/web/runtime/core/**`.
