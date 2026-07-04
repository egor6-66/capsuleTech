---
title: web-ui — унификация padding-пропсов: единый `p` ("sm"|"md"|число), `padding` уходит
status: ready — 🏛️ АРХ-ВЕС: kit-wide breaking + миграция всех потребителей
audience: owner-сессия `claude-scope -Scope ui` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [042]
---

# Контекст (решение user 2026-07-04)

В kit'е один и тот же концерн назван по-разному с разными типами:
`Card.padding: "none"|"sm"|"md"` vs `Flex.p: number` (+ `List.p/px/py: number`).
Вердикт user: «не может один стиль называться по-разному и принимать разные
значения. Оставить только `p`, принимающий "sm"|"md" либо число».

# Целевой контракт

- Единое имя: **`p`** (+ существующие оси `px`/`py` сохраняют форму значений).
- Тип: `number | 'sm' | 'md'` (+ `'none'`? — решить: `0` покрывает 'none',
  предлагаю БЕЗ 'none', ноль = число 0).
- Пресеты 'sm'/'md' маппятся на фиксированные шаги spacing-шкалы — единые
  для всех компонентов (документировать соответствие: sm=N, md=M).
- `padding` — УДАЛИТЬ (пакет 0.x, pre-release: без deprecated-прослойки,
  но миграция потребителей В ТОМ ЖЕ PR — ничего сломанного в main не едет).

# Scope

1. Инвентаризация: grep по kit'у всех `padding`/`p`/`px`/`py` пропсов
   (Card, Flex, Grid, List, Group, …) — таблица в коммит-сообщение.
2. Единый helper резолва `p`-значения (shared в kit, не копипаста по компонентам).
3. Контракты + manifest'ы (`*.contract.ts`, propsSchemaOf) + README всех
   затронутых — studio-инспектор должен показывать новый тип.
4. Presets kit'а (`*.presets.ts`), использующие `padding` — перевести.
5. Тесты: number и 'sm'/'md' дают ожидаемые классы; `padding` больше не в типах.

# Потребители (мигрируют owner'ы зон, координация architect — cross-PR волны)

- packages/web/learn (`WordTile padding="sm"`, `Info` и др.) — owner-learn.
- packages/web/{studio,shell,boost-*} — по grep'у.
- apps/* — owner-apps.
Architect прогонит repo-wide grep `padding=` после kit-коммита и раздаст
мини-фиксы. Ничего не мержим до зелёного build всех потребителей.

# Acceptance

kit: test+build+biome ✅; таблица маппинга sm/md в README/контрактах;
repo-wide: `nx affected -t build,test,typecheck` зелёный после миграции потребителей.
