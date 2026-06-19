---
title: Select — эталон по канону Button + регистрация в палитре
status: ready
audience: owner-web-ui (cross-PR с architect на одной ветке, продолжение feat/input-etalon-form-split)
last_updated: 2026-06-19
---

# Контекст

Кнопочный эталон (Button) и Input эталон закрыты — оба несут `contract`/`presets`/`docSlug`/`propsSchemaOf(contract)`, manifest зарегистрирован в `manifest/registry.ts`. Палитра студио видит их через `getAllManifests()` и показывает с пресетами.

Следующий примитив — **Select**. Он уже extracted в `primitives/select/` (commit `c484584b`), но **manifest у него отсутствует вообще** — Select не виден в палитре. Делаем по эталону Button/Input + регистрируем.

Параллельно — небольшой cleanup устаревшего комментария в `select/variants.ts`.

# Карта текущего состояния

```
packages/web/kit/ui/src/primitives/select/
├── select.tsx                 ← Kobalte Select wrapper (Trigger/Content/Value/Item)
├── variants.ts                ← selectTriggerCva/selectContentCva/selectItemCva/selectItemIndicatorCva
├── interfaces.ts              ← ISelectOption / ISelectProps / ISelectTriggerProps / ISelectContentProps / ISelectValueProps
├── index.ts                   ← barrel
├── select.stories.tsx
└── __tests__/
```

**Чего нет (создаём):** `select.contract.ts`, `select.presets.ts`, `select.manifest.tsx`, `README.md`.
**Регистрация:** нужно добавить SelectManifest в `manifest/registry.ts` (импорт + ALL[]).

# Скоп

Cross-PR на той же ветке `feat/input-etalon-form-split` (агент знает; architect параллельно работает над playground/web-studio, не пересекается с kit/ui).

## Phase 1 — `select.contract.ts`

По образцу `button.contract.ts` / `input.contract.ts`:

```ts
import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const SelectContract = defineContract({ name: 'Select', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      // Options — массив { value, label, disabled? }. Обязателен для рендера
      // dropdown'а; пресеты должны его задавать.
      options: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
            disabled: z.boolean().optional(),
          }),
        )
        .optional(),
      // Управляемое значение (single-select). `multiple` пока не поддерживаем
      // в контракте — Kobalte Select наш wrapper типизирован под string.
      value: z.string().optional(),
      defaultValue: z.string().optional(),
      placeholder: z.string().optional(),
      disabled: z.boolean().optional(),
      required: z.boolean().optional(),
      name: z.string().optional(),
      'aria-invalid': z
        .union([z.literal('true'), z.literal('false'), z.boolean()])
        .optional(),
    }),
  ),
  // Slots: root = trigger; content = popover panel.
  rule.styleSlots(['root', 'content']),
  rule.examples([
    {
      name: 'simple',
      props: {
        placeholder: 'Выберите…',
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
          { value: 'c', label: 'Option C' },
        ],
      },
    },
    {
      name: 'preselected',
      props: {
        value: 'b',
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ],
      },
    },
    {
      name: 'disabled',
      props: {
        disabled: true,
        placeholder: 'Нельзя выбрать',
        options: [{ value: 'a', label: 'Option A' }],
      },
    },
    {
      name: 'aria-invalid',
      props: {
        'aria-invalid': 'true',
        placeholder: 'Выберите…',
        options: [{ value: 'a', label: 'Option A' }],
      },
    },
  ]),
]);
```

**Watch out — `placeholder`:** В `ISelectProps` сейчас `placeholder?: JSX.Element` (Kobalte позволяет JSX). В contract'е упрощаем до `z.string()` — для палитры/инспектора достаточно текстовой строки. JSX-плейсхолдер всё ещё работает в коде на runtime, contract просто не описывает этот edge-case.

**Watch out — `options` в Inspector'е:** массив объектов сейчас не поддерживается `zod-to-categories.ts` (только text/select/boolean/number) — Inspector тихо его пропустит (graceful degradation). Это OK на текущей итерации — пресеты задают `options`, юзер выбирает пресет; редактирование `options` в Inspector — future framework gap, не Select-specific.

## Phase 2 — `select.presets.ts`

По образцу `button.presets.ts` / `input.presets.ts`. Helper `singleSelect` строит схему. 4 пресета:

```ts
import type { IPreset } from '../../manifest/types';

const singleSelect = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'sel',
    nodes: {
      sel: { id: 'sel', type: 'ui.Select', parentId: null, children: [], props },
    },
  },
});

export const selectPresets: readonly IPreset[] = [
  {
    id: 'simple',
    label: 'Simple',
    schema: singleSelect({
      placeholder: 'Выберите…',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
        { value: 'c', label: 'Option C' },
      ],
    }),
    description:
      'Стандартный выбор из короткого списка (3-7 опций). Базовый случай для фильтров, селекторов категорий, dropdown-меню в формах.',
  },
  {
    id: 'preselected',
    label: 'Preselected',
    schema: singleSelect({
      value: 'b',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
        { value: 'c', label: 'Option C' },
      ],
    }),
    description:
      'Выбор с дефолтным значением. Используй когда форма редактирует существующую сущность и значение поля уже известно.',
  },
  {
    id: 'long-list',
    label: 'Long list',
    schema: singleSelect({
      placeholder: 'Выберите страну…',
      options: [
        { value: 'ru', label: 'Россия' },
        { value: 'us', label: 'США' },
        { value: 'cn', label: 'Китай' },
        { value: 'de', label: 'Германия' },
        { value: 'fr', label: 'Франция' },
        { value: 'jp', label: 'Япония' },
        { value: 'br', label: 'Бразилия' },
        { value: 'in', label: 'Индия' },
      ],
    }),
    description:
      'Длинный список с прокруткой панели (max-height + overflow). Тест что dropdown не ломается на 8+ опциях и виртуализация не нужна.',
  },
  {
    id: 'disabled',
    label: 'Disabled',
    schema: singleSelect({
      disabled: true,
      placeholder: 'Нельзя выбрать',
      options: [{ value: 'a', label: 'Option A' }],
    }),
    description:
      'Неактивный селект — для контекста, когда выбор временно недоступен (другое поле не заполнено, разрешение отсутствует).',
  },
];
```

## Phase 3 — `select.manifest.tsx`

По образцу `input.manifest.tsx`. Иконка — `ChevronsUpDown` из `'../../icons'` (canonical для dropdown). Если её нет в `icons/index.ts` — добавить вместе с manifest'ом (это одна правка `web-ui/icons.tsx`-style).

```tsx
import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { ChevronsUpDown } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { SelectContract } from './select.contract';
import { selectPresets } from './select.presets';

// Contract = root for props. Manifest extends with Inspector-only fields (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(SelectContract);
if (!baseProps) throw new Error('SelectContract has no props schema — add rule.props(...)');

export const SelectManifest: IPrimitiveManifestEntry = {
  type: 'ui.Select',
  label: 'Select',
  category: 'control',
  icon: () => <ChevronsUpDown size={16} />,
  description: 'Выпадающий список с выбором одного значения',
  isLeaf: true,
  contract: SelectContract,
  docSlug: 'web-ui/primitives/select',
  defaultProps: {
    placeholder: 'Выберите…',
    options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ],
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: selectPresets,
  // fieldRule: не добавляем без реального UX-кейса (канон «не на гипотетике»).
  //            Когда появится multi-select или async-options — может понадобиться.
};
```

## Phase 4 — `select/index.ts`

Добавить экспорт contract'а:

```ts
export type * from './interfaces';
export { Select, SelectContent, SelectTrigger, SelectValue } from './select';
export { SelectContract } from './select.contract';
```

## Phase 5 — `select/README.md`

По образцу `input/README.md` (frontmatter `slug: 'web-ui/primitives/select'`). Структура: описание / когда использовать / варианты / примеры / доступность.

## Phase 6 — Registry registration

`packages/web/kit/ui/src/manifest/registry.ts`:

1. Импорт:
   ```ts
   import { SelectManifest } from '../primitives/select/select.manifest';
   ```
2. В `ALL` массив **под секцией `// controls`** рядом с `InputManifest` / `ButtonManifest` / `ToggleManifest`:
   ```ts
   ButtonManifest,
   InputManifest,
   SelectManifest,   // ← новый
   ToggleManifest,
   ```

После этого `getAllManifests()` отдаст SelectManifest, палитра студио покажет его автоматически (через `ComponentsPalette` `getAllManifests()` → `groupManifests()` → отрисует с пресетами).

## Phase 7 — Cleanup `select/variants.ts`

В `variants.ts:30` (комментарий к `selectTriggerCva`) есть устаревший рефс:

```
The shared INPUT_FIELD_BASE carries layout, border, `px-input`, `bg-transparent`
and `outline-none`. It deliberately does NOT carry a focus-visible ring (see
input/base.ts comments): ...
```

`input/base.ts` больше не существует (inline'нут в commit `c484584b`). Заменить «see input/base.ts comments» на «see comments above INPUT_FIELD_BASE» — рефс внутри того же файла теперь.

## Phase 8 — Test sweep

1. `select/__tests__/select.test.tsx` — компонент не менялся, должен быть зелёный. Прогнать `pnpm --filter @capsuletech/web-ui test`.
2. **Возможно добавить** короткий тест `select.manifest.test.ts` (по образцу `button.manifest.test.ts` если есть) — что `propsSchemaOf(SelectContract)` валидирует все 4 examples из contract'а. Если у Button/Input такого теста нет — не делать у Select (consistency).
3. Studio тесты (`packages/web/studio/`) — должны быть зелёные. `ComponentsPalette.test.tsx` не тестит конкретный Select, но проверяет `getAllManifests()` shape.

## Phase 9 — Sanity-check

1. `pnpm --filter @capsuletech/web-ui build` — multi-entry должен автоматически подхватить `select.contract.ts`/`select.presets.ts`/`select.manifest.tsx` (см. `vite.config.mts:144`).
2. `pnpm --filter @capsuletech/web-ui test` + `pnpm --filter @capsuletech/web-studio test` — green.
3. `pnpm nx run-many -t typecheck --projects=web-ui,web-studio,web-core` — публичный API не меняется, type-регрессий быть не должно.
4. `pnpm nx affected -t test build --base=origin/main` — pre-push gate.

# Чего НЕ делать

- НЕ менять `tsconfig.base.json` — `@capsuletech/web-ui/select` paths остаются.
- НЕ менять `kit/ui/package.json#exports` — `./select` subpath стабилен.
- НЕ трогать `select.tsx` — wrapper Kobalte работает, не предмет аудита (исключение: lucide-solid импорты `Check`/`ChevronDown` — это отдельный story `feedback_use_ui_kit_everywhere`, не Select-specific, в скоп этого брифа не входит).
- НЕ добавлять `fieldRule` — нет реального UX-кейса (канон).
- НЕ поддерживать `multiple` в contract — текущий wrapper типизирован под `string`, multi-select — отдельный story.
- НЕ менять `placeholder` тип в `ISelectProps` (JSX.Element остаётся); contract упрощает до string только для манифеста — runtime не ломается.

# Acceptance

- ✅ `select.contract.ts` + `select.presets.ts` + `select.manifest.tsx` + `README.md` — созданы.
- ✅ `select/index.ts` — экспортит `SelectContract`.
- ✅ `manifest/registry.ts` — импортит и регистрирует `SelectManifest` в `ALL`.
- ✅ `select/variants.ts` — устаревший рефс на `input/base.ts` поправлен.
- ✅ Если `ChevronsUpDown` отсутствует в `web-ui/icons` — добавлен (по образцу `TextCursorInput` и др).
- ✅ `pnpm --filter @capsuletech/web-ui build` + `test` — green.
- ✅ `pnpm --filter @capsuletech/web-studio test` — green.
- ✅ В палитре студио появляется Select с 4 пресетами (`simple`/`preselected`/`long-list`/`disabled`) после `pnpm dev` (визуальная проверка делает user).

# Workflow

- **Та же ветка** `feat/input-etalon-form-split` (architect параллельно работает над `packages/web/studio/` и `apps/playground/`, не пересекается с kit/ui).
- Commit-only, без push (push делает user/architect после verify — см. memory `feedback_agents_commit_only_user_pushes`).
- Conventional commits:
  - `feat(web-ui): Select contract + presets + manifest по эталону Button/Input`
  - `feat(web-ui): register SelectManifest in kit registry`
  - `chore(web-ui): fix stale base.ts ref in select/variants.ts`
- Можно склеить commit'ы в один, если так чище.

# Связанное

- `docs/_meta/briefs/input-etalon-and-form-family-split.md` — родительский бриф, оттуда же extraction Select в siblings.
- `docs/_meta/briefs/palette-button-etalon-audit.md` — original эталон Button (items A→D).
- `packages/web/kit/ui/src/primitives/button/` — реферс эталона (button.contract.ts, button.manifest.tsx, button.presets.ts, README.md).
- `packages/web/kit/ui/src/primitives/input/` — самый близкий реферс (Input уже в каноне, повторяем 1:1).
- `packages/web/kit/ui/src/manifest/registry.ts` — где регистрировать.
- `packages/web/runtime/contract/src/derive.ts` — `propsSchemaOf<T>(contract)`.
- memory `feedback_canon_modules_no_crutches` — PRIORITY 0 §0.
- memory `feedback_git_scope_by_change_shape` — cross-package PR canon.
