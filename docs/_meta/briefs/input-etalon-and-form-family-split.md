---
title: Input — эталон по канону Button + раскол form-family (Select/Textarea наружу)
status: ready
audience: owner-web-ui (cross-PR с architect на одной ветке)
last_updated: 2026-06-19
---

# Контекст

Палитра студио и манифест-инфраструктура (items A→D брифа `palette-button-etalon-audit.md`) приведены к канону §0. Button — эталон: `propsSchemaOf(contract)` для манифеста, `manifest.contract`, `manifest.presets`, `manifest.fieldRule`, `IPrimitiveManifestEntry` напрямую. Studio просто потребляет через kit-helpers (`getManifest/getContract/getPresets/applyFieldRule`).

Текущая задача — **второй примитив Input**. Доводим до эталона, попутно чиним структурную аномалию: `Select` и `Textarea` сейчас физически живут **внутри** `primitives/input/` (как `input/select/`, `input/textarea/`), а наружу торчат через shim'ы из `primitives/select/index.ts` + `primitives/textarea/index.ts`. Это «корни в соседа» — input владеет двумя другими примитивами в своей папке.

Раскалываем семейство — каждый примитив получает свой каталог-сосед.

> **Канон §0:** «Пакет с корнями в соседа = монолит-in-disguise». Input/Select/Textarea — три независимых примитива kit'а; общий язык — токены `--input/--border/--ring` в `@capsuletech/web-style`. JS-агрегатор `INPUT_FIELD_BASE` — удобство, не обязательство; каждый примитив может держать свою копию строки классов (source-of-truth = токены, не строка).

# Карта текущего состояния

```
packages/web/kit/ui/src/primitives/
├── input/
│   ├── base.ts                    ← INPUT_FIELD_BASE (shared utility string)
│   ├── input.tsx
│   ├── input.manifest.tsx         ← пока без contract/presets/derive
│   ├── interfaces.ts
│   ├── variants.ts                ← импортит ../base
│   ├── index.ts                   ← export * from './input'
│   ├── select/                    ← АНОМАЛИЯ: чужой примитив
│   │   ├── select.tsx, variants.ts, interfaces.ts, index.ts
│   │   ├── select.stories.tsx, __tests__/
│   └── textarea/                  ← АНОМАЛИЯ: чужой примитив
│       ├── textarea.tsx, variants.ts, interfaces.ts, index.ts
│       ├── textarea.stories.tsx, __tests__/
├── select/
│   └── index.ts                   ← SHIM: re-export из ../input/select/
└── textarea/
    └── index.ts                   ← SHIM: re-export из ../input/textarea/
```

**Внешние потребители subpath'ов (не меняются):**
- `tsconfig.base.json:107,119,126` — paths `@capsuletech/web-ui/{input,select,textarea}` указывают на `primitives/<name>/index.ts`.
- `packages/web/runtime/core/src/ui-kit/imports.tsx:15,115-123` — createLazy() через subpath'ы.
- `packages/web/runtime/core/src/wrappers/interfaces.ts:18,21` — `typeof Select`, `typeof Textarea` через subpath.
- `packages/web/studio/src/inspector/kit.tsx:12-15` — Input/Select/Textarea через subpath.
- `packages/web/kit/ui/package.json#exports` — subpath'ы `./select`, `./textarea`, `./input` указывают на `dist/components/<name>/index.mjs`.

Subpath-контракт стабилен; задача — переехать src без поломки публичных импортов.

**Vite build (см. `kit/ui/vite.config.mts:126-183`):** auto-discovery компонентов через `addComponentEntries` для каждой папки в `src/primitives/`. После переезда новые `primitives/select/` и `primitives/textarea/` автоматически подцепятся. Шаг конфига не нужен.

# Скоп

**Cross-PR на одной ветке с architect'ом.** Architect параллельно работает над playground/каноном (без пересечений по файлам kit). Финальный squash-merge — один логический PR «feat(web-ui): Input эталон + раскол form-family на Select/Textarea siblings».

## Phase 1 — Извлечь Select в `primitives/select/`

1. Физически перенести содержимое `primitives/input/select/` → `primitives/select/`:
   - `select.tsx`, `variants.ts`, `interfaces.ts`, `select.stories.tsx`
   - `__tests__/` (вся папка как есть)
2. **Удалить** shim `primitives/select/index.ts` и написать настоящий barrel:
   ```ts
   // primitives/select/index.ts
   export type * from './interfaces';
   export { Select, SelectContent, SelectTrigger, SelectValue } from './select';
   ```
3. В `select/variants.ts` инлайнить содержимое `INPUT_FIELD_BASE` (тот же литерал, без import'а из `../base`). Комментарий-anchor: tokens живут в `@capsuletech/web-style`, строка — локальная агрегация для CVA.
4. В `select.tsx` пересчитать относительные пути: было `../../../lib/finish` → станет `../../lib/finish` (на один уровень меньше).
5. Если в `select/__tests__/*.tsx` есть импорты с `../../` — пересчитать.
6. **Удалить** старую `primitives/input/select/` целиком после переезда.

## Phase 2 — Извлечь Textarea в `primitives/textarea/`

Зеркально Phase 1:
1. Перенести `primitives/input/textarea/` → `primitives/textarea/`.
2. Удалить shim `primitives/textarea/index.ts`, написать настоящий barrel.
3. Инлайнить `INPUT_FIELD_BASE` в `textarea/variants.ts`.
4. Пересчитать относительные пути если есть.
5. Удалить старую `primitives/input/textarea/`.

## Phase 3 — Cleanup `primitives/input/`

1. **Удалить `input/base.ts`** — больше нет sibling-потребителей.
2. Инлайнить `INPUT_FIELD_BASE` в `input/variants.ts` (та же строка третий раз — это намеренно, источник правды = токены).
3. `input/index.ts` — оставить как есть (только Input). Комментарий про «Select/Textarea live here» — убрать.

## Phase 4 — Input contract

Создать `primitives/input/input.contract.ts` по образцу `button.contract.ts`:

```ts
import { defineContract, rule } from '@capsuletech/web-contract';
import { z } from '@capsuletech/shared-zod';

export const InputContract = defineContract(
  { name: 'Input', kind: 'primitive' },
  [
    rule.isLeaf(),
    rule.props(
      z.object({
        type: z.enum(['text', 'password', 'email', 'tel', 'number', 'url', 'search']).optional(),
        placeholder: z.string().optional(),
        value: z.union([z.string(), z.number()]).optional(),
        defaultValue: z.union([z.string(), z.number()]).optional(),
        disabled: z.boolean().optional(),
        required: z.boolean().optional(),
        readonly: z.boolean().optional(),
        name: z.string().optional(),
        autocomplete: z.string().optional(),
        'aria-invalid': z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
      }),
    ),
    rule.styleSlots(['root']),
    rule.examples([
      { name: 'text', props: { type: 'text', placeholder: 'Введите текст' } },
      { name: 'password', props: { type: 'password', placeholder: 'Пароль' } },
      { name: 'number', props: { type: 'number', placeholder: '0' } },
      { name: 'disabled', props: { type: 'text', disabled: true, value: 'readonly' } },
      { name: 'aria-invalid', props: { type: 'text', 'aria-invalid': 'true' } },
    ]),
  ],
);
```

Экспортить из `primitives/input/index.ts`:
```ts
export * from './input';
export type * as IInput from './interfaces';
export { InputContract } from './input.contract';
```

## Phase 5 — Input presets

`primitives/input/input.presets.ts` по образцу `button.presets.ts`:

```ts
import type { IPreset } from '../../manifest/types';

const singleInput = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'in',
    nodes: {
      in: { id: 'in', type: 'ui.Input', parentId: null, children: [], props },
    },
  },
});

export const inputPresets: readonly IPreset[] = [
  {
    id: 'text',
    label: 'Text',
    schema: singleInput({ type: 'text', placeholder: 'Введите текст' }),
    description: 'Обычный однострочный ввод. Дефолт для имён, описаний, поиска без специальной семантики.',
  },
  {
    id: 'password',
    label: 'Password',
    schema: singleInput({ type: 'password', placeholder: 'Пароль' }),
    description: 'Маскированный ввод для секретов. Браузер скрывает символы, отключает autocomplete по умолчанию. Используй для passwords, PIN, OTP.',
  },
  {
    id: 'number',
    label: 'Number',
    schema: singleInput({ type: 'number', placeholder: '0' }),
    description: 'Числовой ввод с native step-controls. Для количеств, цен, возраста. Для денег с дробной частью — следи за локалью (точка vs запятая).',
  },
];
```

## Phase 6 — Input manifest по эталону Button

Переписать `primitives/input/input.manifest.tsx`:

```tsx
import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { TextCursorInput } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { InputContract } from './input.contract';
import { inputPresets } from './input.presets';

// Contract = root for props (type, placeholder, value, disabled, required, ...).
// Manifest extends with Inspector-only fields (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(InputContract);
if (!baseProps) throw new Error('InputContract has no props schema — add rule.props(...)');

export const InputManifest: IPrimitiveManifestEntry = {
  type: 'ui.Input',
  label: 'Input',
  category: 'control',
  icon: () => <TextCursorInput size={16} />,
  description: 'Однострочный текстовый ввод',
  isLeaf: true,
  contract: InputContract,
  docSlug: 'web-ui/primitives/input',
  defaultProps: {
    type: 'text',
    placeholder: '',
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: inputPresets,
  // fieldRule: пока не нужен — все поля имеют смысл при любом type'е.
  //            Если появится реальный кейс (например, скрывать pattern при type==='number')
  //            — добавим тогда, не на гипотетике.
};
```

## Phase 7 — README

Создать `primitives/input/README.md` по образцу `button/README.md` (если он есть — посмотреть структуру frontmatter + разделы). Описание/Когда использовать/Variants (type'ы)/Примеры/Доступность.

Если у Button README с frontmatter `slug: 'web-ui/primitives/button'` — у Input аналогично `slug: 'web-ui/primitives/input'` (соответствие `manifest.docSlug`).

## Phase 8 — Test sweep

1. `input/__tests__/input.test.tsx` — компонент Input не менялся структурно (только manifest), тесты должны зелёные. Прогнать `pnpm --filter @capsuletech/web-ui test`.
2. `select/__tests__/*` и `textarea/__tests__/*` после переезда — пересчитать импорты `../select` (был `../select` — остаётся `../select`).
3. Добавить тест на новый presets-shape для Input в `palette/__tests__/ComponentsPalette.test.tsx`-стиле? **Не нужно** — studio уже тестит generic `getPresets('ui.Button')`, тот же helper работает для Input без отдельного теста.

## Phase 9 — Sanity-check

1. `pnpm --filter @capsuletech/web-ui build` — multi-entry должен подхватить новые `primitives/select/` и `primitives/textarea/` автоматически (см. `vite.config.mts:144,153,180` — auto-discovery).
2. `pnpm --filter @capsuletech/web-ui test` + `pnpm --filter @capsuletech/web-studio test` — должны быть зелёные.
3. `pnpm nx run-many -t typecheck --projects=web-ui,web-studio,web-core` — публичный API субпатов не меняется, не должно быть type-регрессий.
4. `pnpm nx affected -t test build --base=origin/main` — pre-push gate.

# Чего НЕ делать

- НЕ менять `tsconfig.base.json` — paths указывают на `primitives/<name>/index.ts`, новые barrel'ы лежат там же.
- НЕ менять `kit/ui/package.json#exports` — subpath'ы `/select`, `/textarea`, `/input` стабильны.
- НЕ трогать потребителей в `web-core/ui-kit/imports.tsx`, `web-core/wrappers/interfaces.ts`, `studio/inspector/kit.tsx` — они импортят через subpath, не через relative path.
- НЕ добавлять `fieldRule` Input'у на гипотетике — только когда появится реальный UX-кейс.
- НЕ переименовывать subpath'ы, НЕ менять имена экспортов (Select/SelectTrigger/SelectContent/SelectValue/Textarea/Input).
- НЕ менять `InputManifest` shape в `manifest/registry.ts` (уже импортируется по имени).

# Acceptance

- ✅ `primitives/input/{select,textarea}/` — удалены.
- ✅ `primitives/select/` и `primitives/textarea/` — содержат реальный код (не shim).
- ✅ `input/base.ts` — удалён; `INPUT_FIELD_BASE` инлайнен в каждом из трёх variants.ts.
- ✅ `input.contract.ts` + `input.presets.ts` — созданы.
- ✅ `input.manifest.tsx` — `propsSchemaOf(InputContract)`, `contract: InputContract`, `presets: inputPresets`, `docSlug`. Никаких `IComponentManifest` / hand-maintained propsSchema.
- ✅ `pnpm --filter @capsuletech/web-ui build` + `test` — green.
- ✅ `pnpm --filter @capsuletech/web-studio test` — green (использует `getPresets('ui.Input')` через тот же helper).
- ✅ studio palette показывает Input → 3 пресета (text/password/number) после `pnpm dev`.

# Workflow

- Одна ветка `feat/input-etalon-form-split` (или текущая рабочая ветка architect'а — user решает).
- Commit-only, без push (push делает user/architect после verify — см. memory `feedback_agents_commit_only_user_pushes`).
- Conventional commits: `feat(web-ui): extract Select to its own primitive dir`, `feat(web-ui): extract Textarea to its own primitive dir`, `refactor(web-ui): inline INPUT_FIELD_BASE per primitive (drop input/base.ts)`, `feat(web-ui): Input contract + presets + manifest по эталону Button`.
- После всех phase'ов прогнать smoke (`pnpm test:e2e:cli` — НЕ обязательно для kit-only изменений, достаточно `pnpm nx affected`).

# Связанное

- `docs/_meta/briefs/palette-button-etalon-audit.md` — родительский бриф (items A→D), эталон Button.
- `packages/web/kit/ui/src/primitives/button/` — реферс эталона (button.contract.ts, button.manifest.tsx, button.presets.ts, README.md).
- `packages/web/kit/ui/src/manifest/registry.ts:88-150` — getManifest/getContract/getPresets/applyFieldRule.
- `packages/web/runtime/contract/src/derive.ts` — `propsSchemaOf<T>(contract)`.
- `memory/feedback_canon_modules_no_crutches.md` — PRIORITY 0 §0 (модули, не корни в соседа).
- `memory/feedback_git_scope_by_change_shape.md` — cross-package PR canon (`@0.1`).
