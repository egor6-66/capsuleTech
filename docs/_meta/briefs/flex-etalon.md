---
title: Flex — эталон по канону Button/Input/Select/Toggle/Typography
status: ready
audience: owner-web-ui (работает напрямую в `main`, commit-only, без push)
last_updated: 2026-06-20
---

# Контекст

Эталоны Button / Input / Select / Toggle / Typography закрыты. Следующий примитив — **Flex**, первый из контейнерных. Уже extracted в `primitives/layout/flex/`, `FlexManifest` **уже зарегистрирован** в `manifest/registry.ts` под секцией `// containers`, unit-тесты есть.

Манифест ещё старого образца — без contract'а, без пресетов, без `propsSchemaOf`, без `docSlug`. `propsSchema` описывает только часть публичного API (direction/align/justify/wrap/gap/h/w/fluid/class/style), игнорируя orientation/gapX/gapY/inline/minH/maxH/minW/maxW которые компонент уже принимает. Подтягиваем к канону Input.

**Важно — пост-split state.** Resize-режим выехал в отдельный `Layout.Resizable` (см. бриф `resizable-extract.md`, коммиты `b3844a0e` / `7af32bbc` / `01d846fc`). Flex теперь **только CSS-flex с children** — никаких items/withHandle/handleDisabled/onSizesChange, никаких runtime-only watch-out'ов. Бриф ниже это учитывает.

# Карта текущего состояния

```
packages/web/kit/ui/src/primitives/layout/flex/
├── flex.tsx                ← Solid-компонент: CSS-flex only (items-mode удалён в Phase 3 resizable-extract)
├── interfaces.ts           ← IFlexProps<T> = ISlotProps<T> & IFlexOwnProps + FlexOrientation
├── flex.manifest.tsx       ← старого образца (inline propsSchema, неполная)
├── flex.stories.tsx        ← после resizable-extract: только CSS-flex stories
├── index.ts                ← экспортит Flex + namespace IFlex
└── __tests__/
    └── flex.test.tsx       ← после resizable-extract: только CSS-flex тесты (items уехали в resizable.test.tsx)
```

**Чего нет (создаём):** `flex.contract.ts`, `flex.presets.ts`, `README.md`.
**Что переписываем:** `flex.manifest.tsx` (через `propsSchemaOf(FlexContract)`, добавить `contract` / `docSlug` / `presets`; **сохранить** `canBeRoot: true` и существующий `defaultProps` с padding-стилем + `class: 'w-full'`), `flex/index.ts` (экспорт `FlexContract`).
**Registry:** `manifest/registry.ts` уже импортит `FlexManifest` — изменений не требуется.

# Скоп

Работа **напрямую в `main`** (по сигналу user'а). Без отдельной ветки. Commit-only, **без push** — push делает user (memory `feedback_agents_commit_only_user_pushes`). Architect-hook `git-gate` режет `git push`/`git switch` — не пытаемся обойти.

Flex — **container**, не leaf. В contract'е **НЕ** ставим `rule.isLeaf()`. Acceptance детей — любые (универсальный flex-контейнер); `rule.accepts` тоже не задаём.

## Phase 1 — `flex.contract.ts`

По образцу `input.contract.ts` / `select.contract.ts`. Описываем CSS-flex-mode + sizing — это всё что имеет смысл редактировать в Inspector'е статически:

```ts
import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

// Sizing-шкала: положительные числа (spacing × 0.25rem) или 'full' (100%).
const sizingScale = z.union([z.number(), z.literal('full')]);

export const FlexContract = defineContract({ name: 'Flex', kind: 'primitive' }, [
  // container: НЕ isLeaf, accepts детей любого типа (default behaviour без rule.accepts).
  rule.props(
    z.object({
      // Ось/направление.
      orientation: z.enum(['horizontal', 'vertical']).optional(),
      direction: z.enum(['row', 'row-reverse', 'col', 'col-reverse']).optional(),
      // Раскладка.
      wrap: z.enum(['wrap', 'nowrap', 'wrap-reverse']).optional(),
      align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(),
      justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
      // gap: число (× 0.25rem) или сырое CSS-значение (для токенов вроде 'var(--space-component)').
      gap: z.union([z.number(), z.string()]).optional(),
      gapX: z.union([z.number(), z.string()]).optional(),
      gapY: z.union([z.number(), z.string()]).optional(),
      // display: inline-flex.
      inline: z.boolean().optional(),
      // Sizing.
      h: sizingScale.optional(),
      minH: z.number().optional(),
      maxH: z.number().optional(),
      w: sizingScale.optional(),
      minW: z.number().optional(),
      maxW: z.number().optional(),
      // Responsive basis: flex: 1 1 Npx.
      fluid: z.number().optional(),
    }),
  ),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'row', props: { direction: 'row', gap: 2, align: 'center' } },
    { name: 'col', props: { direction: 'col', gap: 2 } },
    { name: 'centered', props: { direction: 'col', align: 'center', justify: 'center' } },
    { name: 'space-between', props: { direction: 'row', justify: 'between', align: 'center' } },
    { name: 'wrap', props: { direction: 'row', wrap: 'wrap', gap: 2 } },
    { name: 'inline', props: { direction: 'row', inline: true, gap: 1, align: 'center' } },
    { name: 'fixed-height', props: { direction: 'col', h: 40 } },
    { name: 'full-width', props: { direction: 'row', w: 'full', align: 'center' } },
    { name: 'fluid-card', props: { direction: 'col', fluid: 320, gap: 2 } },
  ]),
]);
```

**Watch out — items / resize props:** не описываем (их больше нет в Flex после resizable-extract). Resizable-сценарии — отдельный `Layout.Resizable` primitive, у него будет свой эталон-бриф.

**Watch out — `as` (полиморфизм):** runtime-only, как у Button/Typography. В contract не включаем.

**Watch out — `class` / `style`:** в contract **не включаем** — это inspector-fields, расширяем в `propsSchema` манифеста (`baseProps.extend({ class, style })`). Так же сделано у Button/Input.

**Watch out — нет `rule.isLeaf()`:** Flex — контейнер. Без `isLeaf` дефолт `canAcceptChild` принимает любого ребёнка (см. `registry.ts:123`). Если позже захочется ограничить (например, `accepts(['ui.Layout.Flex', 'ui.Layout.Grid'])`) — добавим, не сейчас.

## Phase 2 — `flex.presets.ts`

По образцу `input.presets.ts`. Контейнерные пресеты особенные: они задают **пустой контейнер** с конкретной геометрией (юзер дальше складывает в него детей через DnD). 6 пресетов покрывают типовые роли:

```ts
/**
 * Flex presets — именованные варианты Flex-контейнера для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Контейнерные пресеты — это «формы layout'а»; превью показывает пустой
 * Flex-блок с min-height (через `var(--size-slot)` в пустом состоянии), юзер
 * после DnD'а наполняет его детьми.
 */

import type { IPreset } from '../../../manifest/types';

const singleFlex = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'flex',
    nodes: {
      flex: { id: 'flex', type: 'ui.Layout.Flex', parentId: null, children: [], props },
    },
  },
});

export const flexPresets: readonly IPreset[] = [
  {
    id: 'row',
    label: 'Row',
    schema: singleFlex({ direction: 'row', gap: 2, align: 'center' }),
    description:
      'Горизонтальная строка с базовым gap и выравниванием по центру (cross-axis). Дефолт для toolbar, header-строки, inline-actions.',
  },
  {
    id: 'col',
    label: 'Column',
    schema: singleFlex({ direction: 'col', gap: 2 }),
    description:
      'Вертикальная колонка с базовым gap. Дефолт для form-полей, секций, sidebar-меню. Один из самых частых контейнеров приложения.',
  },
  {
    id: 'centered',
    label: 'Centered',
    schema: singleFlex({ direction: 'col', align: 'center', justify: 'center', gap: 2 }),
    description:
      'Центрирование по обеим осям. Используй для empty-state, loading-фолбэков, hero-блоков, авторизационных карточек.',
  },
  {
    id: 'space-between',
    label: 'Space between',
    schema: singleFlex({ direction: 'row', justify: 'between', align: 'center' }),
    description:
      'Прижимает первый и последний элемент к краям, остальное растягивает. Канон для header-баров (logo ←→ actions), листинговых строк, panel-footer.',
  },
  {
    id: 'wrap',
    label: 'Wrap',
    schema: singleFlex({ direction: 'row', wrap: 'wrap', gap: 2 }),
    description:
      'Горизонтальная раскладка с переносом. Используй для tag-cloud, фильтр-чипов, gallery-сеток до перехода на полноценный Grid.',
  },
  {
    id: 'fluid-card',
    label: 'Fluid card',
    schema: singleFlex({ direction: 'col', fluid: 320, gap: 2 }),
    description:
      'Адаптивный карточный блок: растёт/сжимается, basis = 320px. В сочетании с родителем `wrap=wrap` даёт responsive-grid из карточек без CSS Grid.',
  },
];
```

**Watch out — defaultProps в манифесте vs пресеты:** `FlexManifest.defaultProps` сейчас задаёт `class: 'w-full'` + inline-padding-стиль (`padding: var(--space-card)`). Это применяется при дропе примитива **без пресета**. Пресеты задают только их специфичные props — `padding`/`w-full` приедут из `defaultProps` через merge при `getDefaultProps()`. Если палитра у тебя вызывает merge — OK; если пресеты применяются как plain replace, защити `padding`/`w-full` в превью добавив их в props пресета. Глянь по факту через `palette/DraggablePresetItem.tsx` (как у Button-пресетов с `children`).

## Phase 3 — `flex.manifest.tsx`

Переписываем по образцу `input.manifest.tsx`, **сохраняя** `canBeRoot: true` и существующий `defaultProps`:

```tsx
import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { Rows3 } from '../../../icons';
import type { IPrimitiveManifestEntry } from '../../../manifest/types';
import { FlexContract } from './flex.contract';
import { flexPresets } from './flex.presets';

// Contract = root for props. Manifest extends with Inspector-only fields (class, style).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(FlexContract);
if (!baseProps) throw new Error('FlexContract has no props schema — add rule.props(...)');

export const FlexManifest: IPrimitiveManifestEntry = {
  type: 'ui.Layout.Flex',
  label: 'Flex',
  category: 'container',
  icon: () => <Rows3 size={16} />,
  description: 'Flexbox-контейнер: направление, выравнивание, gap',
  // НЕ ставим isLeaf — Flex принимает детей.
  canBeRoot: true,
  contract: FlexContract,
  docSlug: 'web-ui/primitives/layout/flex',
  defaultProps: {
    direction: 'col',
    // gap токеном — стандартный шаг между компонентами в колонке/строке.
    gap: 'var(--space-component)',
    class: 'w-full',
    // padding через инлайн-стиль с CSS-токеном — не требует Tailwind content-scan
    // в приложении-консьюмере.
    style: { padding: 'var(--space-card)' },
  },
  propsSchema: baseProps.extend({
    class: z.string().optional().default('w-full'),
    style: z.record(z.string()).optional().default({ padding: 'var(--space-card)' }),
  }),
  presets: flexPresets,
  // styleSlots остаются из contract.surface (rule.styleSlots(['root'])).
  // fieldRule: НЕ добавляем. Возможный будущий кейс — скрывать `direction`,
  //            когда `orientation` задан (overlap), но это hint, не constraint;
  //            решим когда появится UX-боль.
};
```

**Watch out — старый `styleSlots: ['root']` в манифесте:** уезжает (теперь приходит из `contract.surface.styleSlots`). `IPrimitiveManifestEntry.styleSlots` если есть как отдельное поле в типе — удалить из манифеста (single source = contract). Проверь `manifest/types.ts` перед удалением; если поле манифеста — top-level и читается отдельно от contract, оставь как было до отдельной миграции.

## Phase 4 — `flex/index.ts`

Добавить экспорт contract'а:

```ts
export { Flex } from './flex';
export { FlexContract } from './flex.contract';
export type * as IFlex from './interfaces';
```

## Phase 5 — `flex/README.md`

По образцу `input/README.md` (frontmatter `slug: 'web-ui/primitives/layout/flex'`, `last_updated: 2026-06-20`, `tags: [web-ui, primitive, layout, flex, container]`). Секции:

- описание (низкоуровневая Flexbox-обёртка, два режима: CSS-flex + items/resizable);
- когда использовать (любой layout-контейнер; для табличных сеток — Grid; для resize-сплиттеров — items-mode);
- props таблица (orientation / direction / wrap / align / justify / gap / gapX / gapY / inline / h / minH / maxH / w / minW / maxW / fluid / as / class / style);
- режимы (children CSS-flex / static items / resizable items — короткий пример каждого с пояснением когда применять);
- gap-токены (`'var(--space-component)'` дефолт, числа = spacing-шкала, `gapX`/`gapY` overrides);
- sizing-шкала (`h={10}` ≡ `h-10` в Tailwind, `'full'` = 100%, `fluid` для responsive basis);
- empty container (auto `min-height: var(--size-slot)` для droppable-зон в редакторе);
- полиморфизм (`as` — для `<section>`/`<nav>` без потери стилей);
- доступность (Flex не несёт собственной семантики, используй `as="nav"`/`section` под смысл);
- tokens / стили (только переменные темы; `--space-component`, `--space-card`, `--size-slot`);
- slots / hooks (data-атрибутов нет на сегодня; класс root для тест-селектора);
- контракт для studio (ссылка на `flex.contract.ts`, что items/resizable за пределами contract'а);
- связанное (Grid сосед по `layout/`, Card как один из частых child'ов).

## Phase 6 — Sanity-check

1. `pnpm --filter @capsuletech/web-ui build` — multi-entry должен подхватить `flex.contract.ts`/`flex.presets.ts` автоматически.
2. `pnpm --filter @capsuletech/web-ui test` — green, включая существующий `flex.test.tsx`.
3. `pnpm --filter @capsuletech/web-studio test` — green (палитра контейнерных пресетов не должна сломаться).
4. `pnpm nx run-many -t typecheck --projects=web-ui,web-studio` — публичный API не меняется (`Flex`, namespace `IFlex` сохранены), добавляется только `FlexContract`.
5. `pnpm nx affected -t test build --base=origin/main` — pre-push gate (запускает user перед push).
6. Manual sanity — `getManifest('ui.Layout.Flex').canBeRoot === true` после переписки манифеста (это не должно регрессировать).

# Чего НЕ делать

- НЕ менять `flex.tsx` — компонент работает, не предмет аудита (только CSS-flex после resizable-extract).
- НЕ менять `interfaces.ts` — `IFlexProps` / `IFlexOwnProps` стабильны (без items/IFlexItem после resizable-extract).
- НЕ описывать `as` в contract'е — polymorphism canon Button/Typography.
- НЕ убирать `canBeRoot: true` из манифеста.
- НЕ убирать `class: 'w-full'` и `style: { padding: 'var(--space-card)' }` из `defaultProps` манифеста — это canonical-дефолт капсульного приложения (padding-токен через inline, чтобы не зависеть от Tailwind purge у потребителя).
- НЕ менять `manifest/registry.ts` — FlexManifest уже зарегистрирован под `// containers`.
- НЕ создавать `__browser__/` — у Input/Select/Toggle/Typography его нет.
- НЕ переключать ветку, НЕ пушить — работаем в `main`, commit-only.
- НЕ запускать `git restore .` / `git checkout -- .` на грязном дереве (memory `feedback_no_blanket_restore`). Незнакомые правки → STOP + эскалация.

# Acceptance

- ✅ `flex.contract.ts` создан, экспортит `FlexContract` со всеми CSS-flex + sizing-полями.
- ✅ `flex.presets.ts` создан, экспортит `flexPresets` (6 пресетов: row / col / centered / space-between / wrap / fluid-card).
- ✅ `flex.manifest.tsx` переписан — несёт `contract`, `docSlug`, `presets`, `propsSchema` через `propsSchemaOf(FlexContract).extend({ class, style })`; сохраняет `canBeRoot: true` и существующий `defaultProps` (direction='col', gap=токен, class='w-full', style padding-токен).
- ✅ `flex/index.ts` экспортит `FlexContract`, сохраняет namespace `IFlex` и `Flex`.
- ✅ `flex/README.md` создан с frontmatter `slug: 'web-ui/primitives/layout/flex'`.
- ✅ Существующий `flex.test.tsx` — green без изменений.
- ✅ `pnpm --filter @capsuletech/web-ui build` + `test` — green.
- ✅ `pnpm --filter @capsuletech/web-studio test` — green.
- ✅ В палитре студио Flex отображается с 6 пресетами после `pnpm dev` (визуальная проверка делает user).
- ✅ `getManifest('ui.Layout.Flex').canBeRoot === true` (root-droppable не сломан).

# Workflow

- Ветка — `main`, без переключений.
- Conventional commits (можно одним коммитом, можно разделить):
  - `feat(web-ui): Flex contract + presets по эталону Button/Input/Select`
  - `feat(web-ui): rewrite FlexManifest через propsSchemaOf(FlexContract)`
  - `docs(web-ui): README для Flex primitive`
- Commit-only. **Push делает user после verify** (memory `feedback_agents_commit_only_user_pushes`, `feedback_no_broken_pr_reaches_git`).
- Перед announce «готово» прогнать `pnpm --filter @capsuletech/web-ui build && pnpm --filter @capsuletech/web-ui test && pnpm --filter @capsuletech/web-studio test`. Без этого — не докладывать готовность.

# Связанное

- `docs/_meta/briefs/toggle-etalon.md`, `docs/_meta/briefs/typography-etalon.md` — параллельные брифы, тот же флоу.
- `docs/_meta/briefs/select-etalon.md` — ближайший прецедент по структуре файлов.
- `docs/_meta/briefs/input-etalon-and-form-family-split.md` — родительский эталон.
- `packages/web/kit/ui/src/primitives/input/` — самый близкий референс контракт-канона.
- `packages/web/kit/ui/src/primitives/layout/grid/grid.manifest.tsx` — сосед-контейнер, второй кандидат на этот же флоу.
- `packages/web/kit/ui/src/manifest/registry.ts` — где регистрация (FlexManifest уже там).
- `packages/web/kit/ui/src/manifest/types.ts` — `IPrimitiveManifestEntry.canBeRoot`/`isLeaf`/`accepts`.
- `packages/web/runtime/contract/src/rules.ts` — `rule.props/styleSlots/examples/isLeaf/accepts`.
- `packages/web/runtime/contract/src/derive.ts` — `propsSchemaOf<T>(contract)`.
- memory `feedback_canon_modules_no_crutches` — PRIORITY 0 §0 (эталон = код + тесты + доки).
- memory `feedback_agents_commit_only_user_pushes` — commit-only флоу.
- memory `feedback_no_branch_switch_shared_tree` — работаем в текущей ветке.
