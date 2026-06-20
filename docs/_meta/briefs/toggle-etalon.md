---
title: Toggle — эталон по канону Button/Input/Select
status: ready
audience: owner-web-ui (работает напрямую в `main`, commit-only, без push)
last_updated: 2026-06-20
---

# Контекст

Кнопочный эталон закрыт (Button), за ним поднялись Input и Select — все три несут `contract` / `presets` / `docSlug` / `propsSchemaOf(contract)`, manifest зарегистрирован в `manifest/registry.ts`, в палитре студио видны с превью-пресетами через `Renderer mode="static"`.

Следующий примитив — **Toggle**. Он уже extracted в `primitives/toggle/`, его `ToggleManifest` **уже зарегистрирован** в `registry.ts` (видим в палитре), но манифест ещё «старого» образца — без contract'а, без пресетов, без `propsSchemaOf`, без `docSlug`. Подтягиваем 1:1 к канону Input.

# Карта текущего состояния

```
packages/web/kit/ui/src/primitives/toggle/
├── toggle.tsx              ← Solid-компонент (controlled/uncontrolled, role=switch)
├── variants.ts             ← toggleTrackCva / toggleThumbCva / toggleLabelCva
├── interfaces.ts           ← IToggleProps (checked, defaultChecked, onChange, label, size)
├── toggle.manifest.tsx     ← старого образца (inline propsSchema, без contract+presets)
├── toggle.stories.tsx
└── index.ts                ← экспортит Toggle + IToggleProps
```

**Чего нет (создаём):** `toggle.contract.ts`, `toggle.presets.ts`, `__tests__/toggle.test.tsx`, `README.md`.
**Что переписываем:** `toggle.manifest.tsx` (через `propsSchemaOf(ToggleContract)`, добавить `contract`, `docSlug`, `presets`), `toggle/index.ts` (экспорт `ToggleContract`).
**Registry:** `manifest/registry.ts` уже импортит `ToggleManifest` — изменений не требуется, импорт остаётся.

# Скоп

Работа **напрямую в `main`** (user так попросил). Без отдельной ветки. Commit-only, **без push** — push делает user (memory `feedback_agents_commit_only_user_pushes`). Architect-hook `git-gate` режет `git push` / `git switch` для всех; ты упрёшься в блок если попробуешь сменить ветку — этого делать НЕ нужно.

## Phase 1 — `toggle.contract.ts`

По образцу `input.contract.ts` / `select.contract.ts`:

```ts
import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const ToggleContract = defineContract({ name: 'Toggle', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      size: z.enum(['sm', 'md', 'lg']).optional(),
      label: z.string().optional(),
      // Controlled: текущее состояние. Если не задано — режим uncontrolled.
      checked: z.boolean().optional(),
      // Начальное состояние для uncontrolled-режима. Используется в presets,
      // чтобы пресет рендерился в палитре в нужном виде (on/off).
      defaultChecked: z.boolean().optional(),
      disabled: z.boolean().optional(),
      name: z.string().optional(),
      'aria-invalid': z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
    }),
  ),
  // Slots: track = внешняя кнопка (root), thumb = бегунок, labelText = подпись.
  // Если решишь оставить один root — это OK, у Toggle стиль-слотов в реальном
  // использовании сейчас нет; согласуй с тем, что объявлено у Button/Input
  // (single root). Single root безопаснее, расширим когда понадобится.
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'off', props: { size: 'md', label: 'Уведомления' } },
    { name: 'on', props: { size: 'md', label: 'Уведомления', defaultChecked: true } },
    { name: 'sm', props: { size: 'sm', label: 'Компакт' } },
    { name: 'lg', props: { size: 'lg', label: 'Крупный' } },
    { name: 'disabled', props: { size: 'md', label: 'Заблокирован', disabled: true } },
    { name: 'aria-invalid', props: { size: 'md', label: 'Ошибка', 'aria-invalid': 'true' } },
  ]),
]);
```

**Watch out — `onChange`:** в контракт **не включаем**. Контракт описывает props для палитры/inspector'а; обработчики — runtime-only. `onChange` остаётся в `IToggleProps` как было.

**Watch out — `aria-invalid`:** компонент сейчас этот атрибут НЕ читает (см. `toggle.tsx`). Это форвард-совместимо: добавляем в контракт под общий канон форм-семейства (Input/Select его уже описывают). Если хочешь полностью consistent — оставляем в контракте, в `toggle.tsx` НЕ трогаем (не в скоупе этого брифа).

## Phase 2 — `toggle.presets.ts`

По образцу `input.presets.ts`. Helper `singleToggle` строит схему. Идея пресетов — показать в палитре оба состояния (off/on), три размера, disabled:

```ts
/**
 * Toggle presets — именованные варианты Toggle-компонента для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Покрываем 4 базовых кейса: off (дефолт), on (preselected), три размера, disabled.
 */

import type { IPreset } from '../../manifest/types';

const singleToggle = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'tgl',
    nodes: {
      tgl: { id: 'tgl', type: 'ui.Toggle', parentId: null, children: [], props },
    },
  },
});

export const togglePresets: readonly IPreset[] = [
  {
    id: 'off',
    label: 'Off',
    schema: singleToggle({ size: 'md', label: 'Уведомления' }),
    description:
      'Переключатель в выключенном состоянии (дефолт). Используй для опций которые по умолчанию неактивны (включить экспериментальный режим, подписаться на рассылку).',
  },
  {
    id: 'on',
    label: 'On',
    schema: singleToggle({ size: 'md', label: 'Уведомления', defaultChecked: true }),
    description:
      'Переключатель в активном состоянии (preselected). Используй когда опция включена по умолчанию (auto-save, push-уведомления).',
  },
  {
    id: 'small',
    label: 'Small',
    schema: singleToggle({ size: 'sm', label: 'Компакт' }),
    description:
      'Компактный размер — для плотных списков настроек, inline-флагов в таблицах.',
  },
  {
    id: 'large',
    label: 'Large',
    schema: singleToggle({ size: 'lg', label: 'Крупный' }),
    description:
      'Крупный размер — для primary-настройки экрана, onboarding-флоу, touch-зоны.',
  },
  {
    id: 'disabled',
    label: 'Disabled',
    schema: singleToggle({ size: 'md', label: 'Заблокирован', disabled: true }),
    description:
      'Неактивный переключатель — когда опция временно недоступна (требует другой настройки, нет разрешения).',
  },
];
```

## Phase 3 — `toggle.manifest.tsx`

Переписываем по образцу `input.manifest.tsx`. Иконка остаётся `ToggleLeft` из `'../../icons'`.

```tsx
import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { ToggleLeft } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { ToggleContract } from './toggle.contract';
import { togglePresets } from './toggle.presets';

// Contract = root for props. Manifest extends with Inspector-only fields (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(ToggleContract);
if (!baseProps) throw new Error('ToggleContract has no props schema — add rule.props(...)');

export const ToggleManifest: IPrimitiveManifestEntry = {
  type: 'ui.Toggle',
  label: 'Toggle',
  category: 'control',
  icon: () => <ToggleLeft size={16} />,
  description: 'Переключатель on/off с подписью',
  isLeaf: true,
  contract: ToggleContract,
  docSlug: 'web-ui/primitives/toggle',
  defaultProps: {
    size: 'md',
    defaultChecked: false,
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: togglePresets,
  // fieldRule: не добавляем — нет реального UX-кейса, при котором поле теряет
  //            смысл в зависимости от значения другого (канон «не на гипотетике»).
};
```

## Phase 4 — `toggle/index.ts`

Добавить экспорт contract'а (по образцу `button/index.ts`):

```ts
export type { IToggleProps } from './interfaces';
export { Toggle } from './toggle';
export { ToggleContract } from './toggle.contract';
```

## Phase 5 — `toggle/__tests__/toggle.test.tsx`

По образцу `input/__tests__/input.test.tsx` — jsdom smoke + reactivity. Минимум:

- renders a `<button role="switch">` element.
- `aria-checked="false"` by default.
- `defaultChecked: true` → `aria-checked="true"` + `data-checked=""` attribute.
- click toggles state (uncontrolled): `aria-checked` flips, `onChange` called с новым значением.
- `disabled` props: click не вызывает `onChange`, native `disabled` атрибут стоит.
- controlled: `checked` prop рулит, click вызывает `onChange` но `aria-checked` не меняется без обновления prop'а.
- size variant class: `size="sm"` → класс содержит `h-4 w-7`; `size="lg"` → `h-6 w-11`.
- `label` prop: рендерится `<label>` с текстом + `for` = id кнопки.
- reactivity: signal-derived `class` обновляется на корневой `<button>`.

Используй паттерн setup/teardown из `input.test.tsx` (создание/удаление `container`, `cleanup?.()`).

## Phase 6 — `toggle/README.md`

По образцу `input/README.md` (frontmatter `slug: 'web-ui/primitives/toggle'`, `last_updated: 2026-06-20`). Секции:

- описание (что это, как импортить);
- когда использовать (off/on в формах, settings, не для бинарного выбора в большом списке — там radio);
- props таблица (size / label / checked / defaultChecked / onChange / disabled / class);
- режимы (controlled vs uncontrolled — короткий пример каждого);
- размеры (sm / md / lg, скриншот-описание визуально);
- доступность (`role="switch"`, `aria-checked`, `disabled` нативный, `data-checked` для CSS, label + `for`);
- tokens / стили (`bg-primary` / `bg-muted` / `bg-background` / `border-border`, transition 200ms);
- slots / hooks (`data-checked` атрибут для тестов и canvas-overlay);
- контракт для studio (ссылка на `toggle.contract.ts`, краткое описание);
- связанное (ссылка на canon-toggle если есть, иначе на label/field).

## Phase 7 — Sanity-check

1. `pnpm --filter @capsuletech/web-ui build` — multi-entry должен автоматически подхватить `toggle.contract.ts`/`toggle.presets.ts` (см. `vite.config.mts`, glob по `primitives/**/*.{ts,tsx}`).
2. `pnpm --filter @capsuletech/web-ui test` — green, включая новый `toggle.test.tsx`.
3. `pnpm --filter @capsuletech/web-studio test` — green (палитра не должна сломаться; манифест остался в registry, форма манифеста расширена).
4. `pnpm nx run-many -t typecheck --projects=web-ui,web-studio` — публичный API не меняется (`Toggle`, `IToggleProps` сохранены), плюс новый export `ToggleContract`.
5. `pnpm nx affected -t test build --base=origin/main` — pre-push gate (запускает user перед push).

# Чего НЕ делать

- НЕ менять `toggle.tsx` — компонент работает, не предмет аудита в этом брифе.
- НЕ менять `variants.ts` — стилевая часть не пересматривается.
- НЕ менять `interfaces.ts` — `IToggleProps` стабилен.
- НЕ добавлять `fieldRule` без реального UX-кейса (канон «не на гипотетике»).
- НЕ добавлять `aria-invalid` обработку в `toggle.tsx` — контракт его объявляет «на будущее», compliance с формами; runtime-поведение — отдельный story (если user попросит).
- НЕ менять `manifest/registry.ts` — `ToggleManifest` там уже импортируется и сидит в `ALL` под секцией `// controls`. Если случайно тронешь — оставь как было.
- НЕ создавать `__browser__/` — у Input/Select его нет, держим consistency. Browser-тесты только у Button (это отдельный story).
- НЕ переключать ветку, НЕ пушить — работаем в `main`, commit-only.
- НЕ запускать `git restore .` / `git checkout -- .` на грязном дереве (memory `feedback_no_blanket_restore`). Если по дороге появятся незнакомые правки — STOP и эскалируй.

# Acceptance

- ✅ `toggle.contract.ts` создан, экспортит `ToggleContract`.
- ✅ `toggle.presets.ts` создан, экспортит `togglePresets` (5 пресетов: off / on / small / large / disabled).
- ✅ `toggle.manifest.tsx` переписан — несёт `contract`, `docSlug`, `presets`, `propsSchema` через `propsSchemaOf(ToggleContract).extend(...)`.
- ✅ `toggle/index.ts` экспортит `ToggleContract`.
- ✅ `toggle/__tests__/toggle.test.tsx` создан, покрывает smoke + reactivity + controlled/uncontrolled + disabled.
- ✅ `toggle/README.md` создан с frontmatter `slug: 'web-ui/primitives/toggle'`.
- ✅ `pnpm --filter @capsuletech/web-ui build` + `test` — green.
- ✅ `pnpm --filter @capsuletech/web-studio test` — green.
- ✅ В палитре студио Toggle отображается с 5 пресетами после `pnpm dev` (визуальную проверку делает user).

# Workflow

- Ветка — `main`, без переключений.
- Conventional commits (можно одним коммитом, можно разделить):
  - `feat(web-ui): Toggle contract + presets по эталону Button/Input/Select`
  - `feat(web-ui): rewrite ToggleManifest через propsSchemaOf(ToggleContract)`
  - `test(web-ui): jsdom smoke + reactivity для Toggle`
  - `docs(web-ui): README для Toggle primitive`
- Commit-only. **Push делает user после verify** (memory `feedback_agents_commit_only_user_pushes`, `feedback_no_broken_pr_reaches_git`).
- Перед announce «готово» прогнать `pnpm --filter @capsuletech/web-ui build && pnpm --filter @capsuletech/web-ui test && pnpm --filter @capsuletech/web-studio test`. Без этого — не докладывать готовность.

# Связанное

- `docs/_meta/briefs/select-etalon.md` — ближайший прецедент, формат 1:1.
- `docs/_meta/briefs/input-etalon-and-form-family-split.md` — родительский эталон form-семейства.
- `docs/_meta/briefs/palette-button-etalon-audit.md` — original эталон Button.
- `packages/web/kit/ui/src/primitives/input/` — самый близкий референс (повторяем 1:1).
- `packages/web/kit/ui/src/primitives/select/` — структурный близнец.
- `packages/web/kit/ui/src/manifest/registry.ts` — где регистрация (ToggleManifest уже там).
- `packages/web/runtime/contract/src/derive.ts` — `propsSchemaOf<T>(contract)`.
- memory `feedback_canon_modules_no_crutches` — PRIORITY 0 §0 (эталон = код + тесты + доки).
- memory `feedback_agents_commit_only_user_pushes` — commit-only флоу.
- memory `feedback_no_branch_switch_shared_tree` — работаем в текущей ветке, не переключаем.
