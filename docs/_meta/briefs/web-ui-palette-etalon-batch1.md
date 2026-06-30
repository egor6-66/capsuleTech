# Brief — web-ui: эталонизация 4 примитивов для палитры студии (batch 1)

**Зона:** owner-web-ui (`packages/web/kit/ui/`). Новых деп НЕ нужно.
**Запуск:** `.\claude-scope.ps1 -Scope ui`. **Тип:** commit-only (push делает architect).
**Цель batch:** Label, Separator, Spinner, Skeleton — простые leaf-примитивы, эталонизация за одну итерацию.

## Контекст / зачем

Палитра студии (`WebStudio.ComponentsPalette`) показывает компонент **живым** (раскрывается, пресеты кликабельны в store-режиме / draggable в creator) **только если у манифеста есть `presets`** — гейт `hasPresets(type)` в `ComponentsPalette.tsx:99`. Без пресетов компонент рендерится мёртвым плоским ярлыком (fallback-div, не интерактивен).

Четвёрка **уже зарегистрирована** в реестре (`packages/web/kit/ui/src/manifest/registry.ts` → `ALL`), но их манифесты — **заглушки**: нет `contract`, нет `presets`, нет `docSlug`, `propsSchema` написан руками. → в палитре висят неактивными ярлыками.

**Эталон** (довести до его уровня) — `primitives/button/`: тройка
`button.contract.ts` + `button.presets.ts` + `button.manifest.tsx` (манифест тянет contract, деривит `propsSchema` через `propsSchemaOf`, цепляет `presets` + `docSlug`). Та же тройка уже есть у Input / Select / Toggle / Typography / Flex — бери любой как образец.

## Что сделать (на КАЖДЫЙ из 4 примитивов)

Source of truth по пропсам — `primitives/<name>/interfaces.ts` самого компонента (НЕ выдумывать; текущий `propsSchema` в манифесте отражает их, но сверь с interfaces).

### 1. `<name>.contract.ts` (новый) — по образцу `button.contract.ts`
```ts
import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const <Name>Contract = defineContract({ name: '<Name>', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(z.object({ /* реальные пропсы из interfaces.ts */ })),
  rule.styleSlots(['root']),
  // rule.variants([...]) если у компонента CVA-variant enum
  rule.examples([ /* 2-4 показательных примера props */ ]),
]);
```

### 2. `<name>.presets.ts` (новый) — по образцу `button.presets.ts`
`IPreset[]` — каждый пресет = JSON-схема для Renderer'а (`{ components: { root, nodes } }`), `type` ноды = dot-path (`ui.Spinner` и т.д. — резолвится в registry `{ui:Ui}`; guard-тест в core это страхует). Leaf-примитивы → одна нода, без children (кроме Label — `children` это строковый проп, не child-нода). `description` на каждый пресет = когда применять (RU), как в button.presets.

Предлагаемый набор пресетов (минимум; owner может уточнить):
- **Label** (`ui.Label`, typography): 1 пресет `Default` (`children: 'Label'`). Достаточно — компонент тривиальный.
- **Separator** (`ui.Separator`, feedback): 2 пресета — `Horizontal` (`variant: 'horizontal'`) и `Vertical` (`variant: 'vertical'`).
- **Spinner** (`ui.Spinner`, feedback): 3 пресета по размеру — `Small`/`Medium`/`Large` (`size: 'sm'|'md'|'lg'`). Опц. 4-й `With label` (`label: 'Загрузка…'`).
- **Skeleton** (`ui.Skeleton`, feedback): по пресету на `variant` — `Text` (rows: 3), `List`, `Card`, `Table`, `Map`. (5; если `map`-вариант визуально пустой/тяжёлый — можно опустить, отметь в отчёте.)

### 3. `<name>.manifest.tsx` — перепровязать на эталон-форму
- `import { propsSchemaOf } from '@capsuletech/web-contract'` + импорт своего contract + presets.
- `contract: <Name>Contract`.
- `propsSchema` — деривить из contract через `propsSchemaOf(...)` (как button.manifest:10), затем `.extend({...})` только для inspector-only полей (`class`, для Label — `children`). НЕ хардкодить заново.
- `presets: <name>Presets`.
- `docSlug: 'web-ui/primitives/<name>'` — **только если** README по этому slug реально существует (проверь docs-registry); иначе опусти поле (тип допускает).
- `defaultProps` оставить консистентными со схемой.
- `fieldRule` — только если есть реальная логика скрытия (вряд ли для этой четвёрки; не выдумывать).

## Scope-границы
- Только `packages/web/kit/ui/src/primitives/{label,separator,spinner,skeleton}/`. Registry `ALL` уже содержит эти манифесты — НЕ трогать порядок/состав.
- НЕ менять сами компоненты (`*.tsx`) — они готовы; только contract+presets+manifest. Если по ходу всплывёт реальный баг компонента — STOP, отметь в отчёте, не чини молча.
- НЕ трогать studio (`ComponentsPalette` потребляет presets через `getPresets` — менять не надо).

## Verify (last-lines в отчёт ОБЯЗАТЕЛЬНО)
- `pnpm --filter @capsuletech/web-ui test` (вкл. `manifest/__tests__/registry.test.ts` — guard резолва type→namespace; presets-схемы должны резолвиться).
- `pnpm --filter @capsuletech/web-ui build`.
- `pnpm nx run web-ui:typecheck`.
- `pnpm exec biome check --write packages/web/kit/ui` + re-stage.
- В отчёте: какие пресеты завёл на каждый компонент + остались ли вопросы по форме.

## Связано
[[project_renderer_convergence]], [[feedback_use_ui_kit_everywhere]], [[reference_adr032_package_controllers]]. Эталон-образец: `primitives/button/` (contract+presets+manifest trio).
