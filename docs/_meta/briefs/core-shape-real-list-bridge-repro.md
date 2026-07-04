---
title: web-core — ROUND 2: репро залипшего selected на РЕАЛЬНОМ стеке (Shape + real ui.List wrap + XState Bridge)
status: ready
audience: owner-сессия `claude-scope -Scope core` (commit-only, ветка feat/wave-voice-auth-gateway)
last_updated: 2026-07-03
adr_refs: [036, 062]
---

# Статус охоты

Баг жив в браузере (learn: подсветка selected залипает на первом выбранном тайле;
selectedId в сторе живой — панель WordInfo обновляется). Три зоны отработали:

- owner-ui: List/Group batch НАПРЯМУЮ + signal-маппер → реактивно ✓ (649f9c88).
- owner-core: Shape → mock-List-контракт + signal-консумер, 3 реконструкции
  (plain / View-wrapped / Controller ctx + UiProxy) → реактивно ✓ (81440dc9).
- Обе серии на `createSignal` и БЕЗ реального List (или без Shape).

# Непокрытые оси (round 2 закрывает ОБЕ сразу)

1. **Источник = XState/Bridge**, не signal: продовый путь =
   `Feature.store.update({selectedId})` → xstate/solid reconcile →
   Widget-getter `(store.ctx).data.selectedId` → JSX-prop Shape.
   web-core может собрать это честно: `createState`+`createBridge`
   (@capsuletech/web-state — уже dep) или через реальный Feature-wrapper.
2. **Реальный `ui.List`** (@capsuletech/web-ui — web-core УЖЕ зависит от него,
   цикла нет), режим **`wrap: true`** — свежий бранч list.tsx (8151cfa9),
   добавлен ПОСЛЕ реактивных тестов ui.

Тест = точная копия продовой цепочки learn:
Feature(context: {senses, selectedId}) → Widget(store 2-й аргумент, getters) →
Shape(bind: as реальный ui.List; config: item.use=View-тайл,
item.props: (it)=>({selected: props.selectedId===it.id}), wrap: true) →
клик/`store.update` меняет selectedId → ассерт: data-selected переехал,
старый снят.

# Если репро ПОЙМАЛСЯ

Фиксить причину в корне (в чьей бы зоне ни была: core — сам; ui/state — STOP,
верни architect'у точный механизм с падающим тестом, он раздаст бриф).

# Если и это зелёное

Значит рвётся на ещё более внешнем слое. Тогда добавить постоянную
trace-инструментацию (ADR 062, канал `web-core.shape`): лог вызова
item.props-маппера (row id + вычисленный selected) — чтобы user снял факт
в реальном браузере одним взглядом на консоль (trace on). Вернуть architect'у.

# Acceptance

Тест(ы) в web-core; `pnpm --filter @capsuletech/web-core test` зелёные;
build пакета; biome. Только `packages/web/runtime/core/**`.
