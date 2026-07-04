---
title: apps/learn — адоптировать новые kit-props (тайлы: адаптивность, selected, отступы)
status: ready
audience: owner-сессия `claude-scope -Scope apps` (commit-only; мы на ветке feat/wave-voice-auth-gateway — коммить в неё, scope-тег `feat(apps-learn)`)
last_updated: 2026-07-03
adr_refs: [036, 068]
---

# Контекст

Канон вычистил raw-class из learn (см. `apps/OWNERSHIP.md` — прочитаешь по
ownership-gate). Owner-ui добавил недостающие props (commit `5dacda9b`):
- **Card**: `interactive` (cursor+hover по токенам), `selected` (поверхность,
  ставит `data-selected` — НЕ aria), `padding: 'none'|'sm'|'md'`;
- **Flex**: `p/px/py` (spacing-шкала), `overflow: 'auto'|'hidden'`, `border`;
- **Button**: `size='xs'` (inline-иконки).

Визуальные регрессии текущего дерева (репорт user):
(1) тайлы фикс-ширины и «поехали» (грид `min: '9rem'` в Shapes.WordTiles
растягивает minmax→1fr вместо контентной ширины); (2) часть текста по центру,
часть по левому краю; (3) нет hover/selected/отступов (класс вычищен, props
ещё не применены).

# Scope (только apps/learn)

1. **views/wordTile.tsx**: `Card interactive selected={props.selected}
   padding="sm"` (убрать ручной `aria-selected` — селект-стайл теперь kit'овый
   `data-selected`); 🔊 → `Button size="xs"`; выравнивание ЕДИНОЕ — все три
   строки по центру (`Typography align="center"`).
2. **shapes/wordTiles.tsx**: вернуть адаптивные тайлы по контенту — грид с
   `min` НЕ подходит (растягивает). Смотри README/интерфейсы `ui.List`: нужен
   flex-режим с переносом и контентной шириной item'ов. Если List таким
   режимом не обладает — проверь `ui.Group` (orientation horizontal + gap;
   wrap?). Если НИ List НИ Group не умеют wrap пропсом — СТОП, верни
   architect'у гэп для брифа owner-ui (НЕ лепи class).
3. **widgets/words.tsx**: скролл-контейнер сетки — `Flex overflow="auto"`
   (внешний столбец h="full"), отступы `p`-props'ами по вкусу chrome'а.
4. **views/wordInfo.tsx**: отступ панели `Flex p={6}`; тег-чипы —
   `Card padding="sm"`.
5. **widgets/navigation.tsx**: вернуть разделитель `Flex border` (см. коммент-GAP
   в файле).

# Известный баг НЕ ТВОЙ

Залипший selected — баг Shape-wrapper'а (web-core), бриф
`core-shape-batch-item-props-reactivity.md`. НЕ обходи его в аппе; после фикса
core твой `selected`-prop заработает сам.

# Проверки (порядок из apps/OWNERSHIP.md)

capsule build (CAPSULE_CI=1) → biome --write+check → dev-diagnostics без error
→ grep `^import ` и `class=` по src = 0 строк.
