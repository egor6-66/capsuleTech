---
title: Typography — эталон по канону Button/Input/Select/Toggle
status: ready
audience: owner-web-ui (работает напрямую в `main`, commit-only, без push)
last_updated: 2026-06-20
---

# Контекст

Эталоны Button / Input / Select закрыты, Toggle в работе (см. `toggle-etalon.md`). Следующий примитив — **Typography**. Уже extracted в `primitives/typography/`, `TypographyManifest` **уже зарегистрирован** в `manifest/registry.ts` (видим в палитре), unit-тесты есть. Но манифест ещё старого образца — без contract'а, без пресетов, без `propsSchemaOf`, без `docSlug`, и `propsSchema` описывает только `variant`/`color`/`children`/`class`, игнорируя `tone`/`align`/`size`/`dim` которые компонент уже принимает. Подтягиваем к канону Input.

# Карта текущего состояния

```
packages/web/kit/ui/src/primitives/typography/
├── typography.tsx              ← Solid-компонент (variant + color CVA + tone/align/size/dim/as)
├── variants.ts                 ← typographyCva (variant: h1/h2/p/blockquote/code/lead/muted, color)
├── interfaces.ts               ← ITypographyProps (extends JSX.HTMLAttributes<HTMLElement>)
├── typography.manifest.tsx     ← старого образца (inline propsSchema, описывает только variant+color)
├── typography.stories.tsx
├── index.ts                    ← экспортит Typography + namespace ITypography
└── __tests__/
    └── typography.test.tsx     ← уже есть, не трогаем (только убедиться что green)
```

**Чего нет (создаём):** `typography.contract.ts`, `typography.presets.ts`, `README.md`.
**Что переписываем:** `typography.manifest.tsx` (через `propsSchemaOf(TypographyContract)`, добавить `contract` / `docSlug` / `presets`, расширить `defaultProps`), `typography/index.ts` (экспорт `TypographyContract`).
**Registry:** `manifest/registry.ts` уже импортит `TypographyManifest` — изменений не требуется.

# Скоп

Работа **напрямую в `main`** (по сигналу user'а). Без отдельной ветки. Commit-only, **без push** — push делает user (memory `feedback_agents_commit_only_user_pushes`). Architect-hook `git-gate` режет `git push`/`git switch` — не пытаемся обойти.

## Phase 1 — `typography.contract.ts`

По образцу `input.contract.ts` / `select.contract.ts`. Описываем **весь публичный API**, включая `tone`/`align`/`size`/`dim`, которые компонент уже умеет, но манифест не показывал:

```ts
import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const TypographyContract = defineContract({ name: 'Typography', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      // Семантический вариант (CVA `variant`). Управляет font-weight/tracking/border.
      // По умолчанию тег выбирается из variant (h1/h2/p/blockquote/code; lead→p; muted→p).
      variant: z.enum(['h1', 'h2', 'p', 'blockquote', 'code', 'lead', 'muted']).optional(),
      // Color override через CVA (старый канал). Поверх него ещё `tone` (см. ниже).
      color: z.enum(['default', 'muted', 'primary', 'destructive']).optional(),
      // Tone — override цвета через отдельный prop. Если задан — переопределяет
      // `color` CVA-variant. Введён, чтобы не лочить юзеров в CVA-color, когда
      // hsна нужна семантика «muted text на primary heading'е».
      tone: z.enum(['default', 'muted', 'destructive', 'primary']).optional(),
      // Выравнивание текста — не пересекается с variant.
      align: z.enum(['start', 'center', 'end']).optional(),
      // Размер шрифта override — поверх variant'а. Полезно для «h2 weight + 5xl size».
      size: z.enum(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']).optional(),
      // Visual dim — opacity-0 при true, иначе opacity-100. Элемент остаётся в DOM,
      // высота сохраняется (полезно для fade-in без layout shift).
      dim: z.boolean().optional(),
    }),
  ),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'h1', props: { variant: 'h1' } },
    { name: 'h2', props: { variant: 'h2' } },
    { name: 'p', props: { variant: 'p' } },
    { name: 'lead', props: { variant: 'lead' } },
    { name: 'muted', props: { variant: 'muted' } },
    { name: 'blockquote', props: { variant: 'blockquote' } },
    { name: 'code', props: { variant: 'code' } },
    { name: 'centered', props: { variant: 'p', align: 'center' } },
    { name: 'tone-primary', props: { variant: 'h2', tone: 'primary' } },
    { name: 'tone-destructive', props: { variant: 'p', tone: 'destructive' } },
    { name: 'size-override', props: { variant: 'h2', size: '5xl' } },
    { name: 'dimmed', props: { variant: 'p', dim: true } },
  ]),
]);
```

**Watch out — `as` (полиморфизм):** в contract **не включаем**. Polymorphic tag — runtime-only, как `as` у Button (тоже не в contract'е). Тег выбирается из `variant`; редактирование тэга вручную — отдельный story.

**Watch out — `children`:** в contract **не включаем** (как у Button: дети — отдельная семантика, добавляем в `propsSchema.extend` манифеста). У Typography `children` это просто текст, опишем в манифесте через `z.string().default('Text')`.

**Watch out — `tone` vs `color`:** оба остаются в контракте. В runtime `tone` overrides `color`. Inspector покажет оба — это OK на текущей итерации, документируем в README что `tone` приоритетнее.

**Watch out — пересечение `size`/`variant`:** `variant` (h1/h2/...) уже задаёт размер. `size` его перебивает. Это нормальный override-шаблон (поведение существующее, не меняется).

## Phase 2 — `typography.presets.ts`

По образцу `input.presets.ts`. Пресеты — по семантическим вариантам + пара overrides для tone/align (показать гибкость). Не перегружаем: палитра не должна тонуть в 15 пресетах, держим 7-8:

```ts
/**
 * Typography presets — именованные варианты Typography-компонента для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Покрываем основные семантические varианты (h1/h2/p/lead/muted/blockquote/code)
 * + один override-пример (центрированный заголовок). Tone/size/dim — реже нужны
 * как «отправная точка», их можно настроить в Inspector'е через contract-fields.
 */

import type { IPreset } from '../../manifest/types';

const singleText = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'txt',
    nodes: {
      txt: { id: 'txt', type: 'ui.Typography', parentId: null, children: [], props },
    },
  },
});

export const typographyPresets: readonly IPreset[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    schema: singleText({ variant: 'h1', children: 'Heading 1' }),
    description:
      'Заголовок верхнего уровня страницы. Один на маршрут (SEO + a11y outline). Тег рендерится как `<h1>`.',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    schema: singleText({ variant: 'h2', children: 'Heading 2' }),
    description:
      'Заголовок секции. Имеет нижний border-b для визуального разделения. Тег `<h2>`.',
  },
  {
    id: 'p',
    label: 'Paragraph',
    schema: singleText({ variant: 'p', children: 'Обычный абзац с базовым размером и нормальным line-height.' }),
    description:
      'Базовый параграф. Дефолт для тела текста, описаний, инструкций. Тег `<p>`.',
  },
  {
    id: 'lead',
    label: 'Lead',
    schema: singleText({ variant: 'lead', children: 'Лид-параграф — крупнее обычного, для вступления раздела.' }),
    description:
      'Вступительный абзац (intro) — крупнее `p`, цвет muted-foreground. Используй один раз в начале раздела/страницы.',
  },
  {
    id: 'muted',
    label: 'Muted',
    schema: singleText({ variant: 'muted', children: 'Вторичный текст — подписи, метаданные, пояснения.' }),
    description:
      'Приглушённый текст для подписей под полями, метаданных, hint-текста. Меньше базы, цвет muted-foreground.',
  },
  {
    id: 'blockquote',
    label: 'Blockquote',
    schema: singleText({ variant: 'blockquote', children: 'Цитата с левой границей и курсивом.' }),
    description:
      'Цитата — левый border-l + italic. Для выделенного авторского текста, отзывов, врезок.',
  },
  {
    id: 'code',
    label: 'Inline code',
    schema: singleText({ variant: 'code', children: 'const x = 42' }),
    description:
      'Inline-код в потоке текста — фон muted, моноширинный шрифт. Для имён переменных, путей, коротких snippet’ов.',
  },
  {
    id: 'centered-heading',
    label: 'Centered heading',
    schema: singleText({ variant: 'h2', align: 'center', children: 'Centered Heading' }),
    description:
      'Heading 2 с центрированием — для hero-секций, modal-заголовков, лендинг-блоков.',
  },
];
```

## Phase 3 — `typography.manifest.tsx`

Переписываем по образцу `input.manifest.tsx`. Иконка остаётся `Type`.

```tsx
import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { Type } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { TypographyContract } from './typography.contract';
import { typographyPresets } from './typography.presets';

// Contract = root for props. Manifest extends with Inspector-only fields
// (children = text content, class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(TypographyContract);
if (!baseProps) throw new Error('TypographyContract has no props schema — add rule.props(...)');

export const TypographyManifest: IPrimitiveManifestEntry = {
  type: 'ui.Typography',
  label: 'Typography',
  category: 'typography',
  icon: () => <Type size={16} />,
  description: 'Текстовый блок с вариантами оформления (h1/h2/p/lead/muted/…)',
  isLeaf: true,
  contract: TypographyContract,
  docSlug: 'web-ui/primitives/typography',
  defaultProps: {
    variant: 'p',
    children: 'Text',
  },
  propsSchema: baseProps.extend({
    children: z.string().default('Text'),
    class: z.string().optional(),
  }),
  presets: typographyPresets,
  // fieldRule: пока не нужен — все поля имеют смысл при любом variant'е.
  //            Возможный кейс на будущее: скрывать `size` для `code`-variant'а
  //            (моноширина обычно фиксирована); добавим когда появится реальное
  //            расхождение, не на гипотетике.
};
```

## Phase 4 — `typography/index.ts`

Добавить экспорт contract'а. Сохраняем существующий `default` export (используется где-то в апах под `import Typography from ...`):

```ts
import { Typography } from './typography';

export type * as ITypography from './interfaces';

export { Typography };
export { TypographyContract } from './typography.contract';
export default Typography;
```

## Phase 5 — `typography/README.md`

По образцу `input/README.md` (frontmatter `slug: 'web-ui/primitives/typography'`, `last_updated: 2026-06-20`, `tags: [web-ui, primitive, typography, text]`). Секции:

- описание (что это, как импортить, что variant выбирает тег по умолчанию);
- когда использовать (h1 один на страницу, lead вначале раздела, muted для подписей, code для inline-snippet'ов);
- props таблица (variant / color / tone / align / size / dim / as / children / class);
- семантические варианты (h1/h2/p/blockquote/code/lead/muted — короткий пример каждого + когда применять);
- color vs tone (объяснить что `tone` перебивает `color`; `tone` — более новый API, предпочитать его);
- размер override (`size` поверх `variant`-размера, для гибридов типа «h2 weight + 5xl size»);
- align override;
- `dim` (fade без layout shift, использовать для skeleton/transition'ов);
- полиморфизм (`as` — когда нужно сменить тег: например `variant="p"` + `as="span"` для inline-параграфа);
- доступность (один `<h1>` на маршрут, hierarchy h1→h2→h3, не пропускать уровни);
- tokens / стили (цвета через theme tokens, transition-colors 200ms);
- slots / hooks (для тестов и canvas-overlay);
- контракт для studio (ссылка на `typography.contract.ts`);
- связанное (Label если он есть, Field для form-семантики).

## Phase 6 — Sanity-check

1. `pnpm --filter @capsuletech/web-ui build` — multi-entry должен подхватить `typography.contract.ts`/`typography.presets.ts` автоматически.
2. `pnpm --filter @capsuletech/web-ui test` — green, включая существующий `typography.test.tsx`.
3. `pnpm --filter @capsuletech/web-studio test` — green.
4. `pnpm nx run-many -t typecheck --projects=web-ui,web-studio` — публичный API не меняется (`Typography`, namespace `ITypography`, default export сохранены), добавляется только `TypographyContract`.
5. `pnpm nx affected -t test build --base=origin/main` — pre-push gate (user запускает перед push).

# Чего НЕ делать

- НЕ менять `typography.tsx` — компонент работает, не предмет аудита.
- НЕ менять `variants.ts` — стилевая часть стабильна.
- НЕ менять `interfaces.ts` — `ITypographyProps` extends `JSX.HTMLAttributes<HTMLElement>` + variants, не трогаем.
- НЕ убирать `default export` из `typography/index.ts` — может быть consumer'ов (memory `feedback_root_cause_before_fix`: проверь через grep перед удалением; в этом брифе явно НЕ удаляем).
- НЕ добавлять `as` в contract — polymorphism remains runtime-only (canon Button).
- НЕ добавлять `fieldRule` без реального UX-кейса.
- НЕ менять `manifest/registry.ts` — `TypographyManifest` уже там, под секцией `// typography`. Если случайно тронешь — оставь как было.
- НЕ создавать `__browser__/` — у Input/Select/Toggle его нет, держим consistency.
- НЕ переключать ветку, НЕ пушить — работаем в `main`, commit-only.
- НЕ запускать `git restore .` / `git checkout -- .` на грязном дереве (memory `feedback_no_blanket_restore`). Незнакомые правки → STOP + эскалация.

# Acceptance

- ✅ `typography.contract.ts` создан, экспортит `TypographyContract` с полями variant/color/tone/align/size/dim.
- ✅ `typography.presets.ts` создан, экспортит `typographyPresets` (8 пресетов: h1/h2/p/lead/muted/blockquote/code/centered-heading).
- ✅ `typography.manifest.tsx` переписан — несёт `contract`, `docSlug`, `presets`, `propsSchema` через `propsSchemaOf(TypographyContract).extend({ children, class })`.
- ✅ `typography/index.ts` экспортит `TypographyContract`, сохраняет `default` export и namespace `ITypography`.
- ✅ `typography/README.md` создан с frontmatter `slug: 'web-ui/primitives/typography'`.
- ✅ Существующий `typography.test.tsx` — green без изменений.
- ✅ `pnpm --filter @capsuletech/web-ui build` + `test` — green.
- ✅ `pnpm --filter @capsuletech/web-studio test` — green.
- ✅ В палитре студио Typography отображается с 8 пресетами после `pnpm dev` (визуальная проверка делает user).

# Workflow

- Ветка — `main`, без переключений.
- Conventional commits (можно одним коммитом, можно разделить):
  - `feat(web-ui): Typography contract + presets по эталону Button/Input/Select`
  - `feat(web-ui): rewrite TypographyManifest через propsSchemaOf(TypographyContract)`
  - `docs(web-ui): README для Typography primitive`
- Commit-only. **Push делает user после verify** (memory `feedback_agents_commit_only_user_pushes`, `feedback_no_broken_pr_reaches_git`).
- Перед announce «готово» прогнать `pnpm --filter @capsuletech/web-ui build && pnpm --filter @capsuletech/web-ui test && pnpm --filter @capsuletech/web-studio test`. Без этого — не докладывать готовность.

# Связанное

- `docs/_meta/briefs/toggle-etalon.md` — параллельный бриф, тот же флоу.
- `docs/_meta/briefs/select-etalon.md` — ближайший прецедент, формат 1:1.
- `docs/_meta/briefs/input-etalon-and-form-family-split.md` — родительский эталон form-семейства.
- `docs/_meta/briefs/palette-button-etalon-audit.md` — original эталон Button.
- `packages/web/kit/ui/src/primitives/input/` — самый близкий референс канона.
- `packages/web/kit/ui/src/manifest/registry.ts` — где регистрация (TypographyManifest уже там).
- `packages/web/runtime/contract/src/derive.ts` — `propsSchemaOf<T>(contract)`.
- memory `feedback_canon_modules_no_crutches` — PRIORITY 0 §0 (эталон = код + тесты + доки).
- memory `feedback_agents_commit_only_user_pushes` — commit-only флоу.
- memory `feedback_no_branch_switch_shared_tree` — работаем в текущей ветке.
