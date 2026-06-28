---
title: Learn Iter 1 — packages/web/learn/ FULL studio-mirror skeleton
status: ready
audience: owner-сессия в scope=learn (claude-scope), commit-only без push
last_updated: 2026-06-28
adr_refs: [055, 047, 033, 032]
supersedes_structure_of: foundation-05-web-learn-skeleton.md
---

# Кто ты и как запуститься

Ты — **owner-сессия пакета `learn`**. Main-сессия (architect) физически зафенсена из `packages/*` scope-хуком, поэтому пакет строишь ты. Запуск (делает USER): `claude-scope ... learn` из repo-root, cwd-сессии — `docker/observability` как обычно.

**Git:** работаешь напрямую в `main`, **commit-only, без push** (push сделает architect после ревью). Никаких topic-веток (memory `no-topic-branches`). Если pre-commit/scope-хук блокнул — STOP + верни состояние architect'у, не обходи.

# Что делаем

`packages/web/learn/` = **полное архитектурное зеркало `packages/web/studio/`**, но домен — обучение (ADR 055 D5). Это **скелет**: структура, конвенции, регистрация, multi-entry build, тесты — всё «по-взрослому» как в studio, но **тела компонентов — плейсхолдеры** (никакой реальной логики/бэкенд-интеграции). Цель — чтобы следующая итерация (наполнение) шла ровно, без рефактора каркаса.

**Эталон для подражания — `packages/web/studio/`.** Открой и сверяйся: `src/capsule.ts`, `src/providers/StudioProvider.tsx`, `src/welcome/Welcome.tsx`, `vite.config.mts`, `package.json`, `OWNERSHIP.md`. Конвенции (JSDoc-шапки, `data-stub`/`data-meta`, phantom `__events`, тонкий Provider, barrel-index, регистрация через `defineCapsuleModule`) копируем 1-в-1.

**НЕ выходи за зону:** только `packages/web/learn/`. `tsconfig.base.json` (paths) и `optimizeDeps.exclude` — НЕ трогаешь, это делают architect + owner-builders отдельно. App (`apps/learn/`) — тоже не твоё.

# Модули (ADR 055 D5) — subpath-структура

```
packages/web/learn/
├── package.json                 ← см. ниже (уже создан architect'ом частично — приведи к финалу)
├── vite.config.mts              ← multi-entry libConfig
├── tsconfig.json
├── project.json
├── vitest.config.ts
├── vitest.setup.ts
├── README.md
├── OWNERSHIP.md                 ← по docs/_meta/OWNERSHIP-template.md, owner=owner-web-learn (будущий)
└── src/
    ├── index.ts                 ← barrel: re-export ./core (framework-agnostic)
    ├── core/
    │   ├── index.ts
    │   ├── interfaces.ts        ← доменные контракты (IConcept/IExercise/IProgressEntry/ISkillNode)
    │   └── provider.tsx         ← Learn.Provider (ТОНКИЙ passthrough, зеркало StudioProvider)
    ├── lesson/
    │   ├── index.ts
    │   ├── LessonView.tsx
    │   ├── Concept.tsx
    │   ├── CodeBlock.tsx
    │   └── TypeError.tsx        ← компонент-имя TypeErrorBadge (не шадоуим global TypeError)
    ├── exercise/
    │   ├── index.ts
    │   ├── Exercise.tsx         ← dispatch по type (Switch/Match)
    │   ├── FillBlank.tsx
    │   ├── BuildClause.tsx
    │   ├── FixTypeError.tsx
    │   └── Translate.tsx
    ├── progress/
    │   ├── index.ts
    │   ├── Progress.tsx
    │   └── SkillTree.tsx
    ├── library/
    │   ├── index.ts
    │   ├── VocabList.tsx
    │   └── BookmarkButton.tsx
    ├── guides/
    │   ├── index.ts
    │   ├── Tour.tsx
    │   ├── Step.tsx
    │   ├── Spotlight.tsx
    │   └── Hint.tsx
    ├── sentence-builder/
    │   ├── index.ts
    │   └── SentenceBuilder.tsx
    ├── welcome/                 ← landing/index-fallback (зеркало studio welcome)
    │   ├── index.ts
    │   ├── Welcome.tsx          ← useEmit('onNavigate') + phantom __events (КАК studio)
    │   ├── types.ts
    │   └── segments.ts          ← LEARN_SEGMENTS (lessons/exercises/progress/library)
    ├── controllers/
    │   └── index.ts             ← гнездо Controllers.Learn (ADR 032), пока `export {}`
    └── capsule.ts               ← defineCapsuleModule({ name: 'Learn', components })
    └── __tests__/
        └── smoke.test.tsx
```

# Файлы — полное содержимое

## `package.json` (привести к этому виду)

> architect создал черновик; добавь `@solidjs/testing-library` в devDeps (версию сверь с pnpm-lock/root — studio тянет её транзитивно). Остальное оставь.

```jsonc
// dependencies: только web-core + web-ui (web-query добавим при backend-интеграции, не сейчас)
"dependencies": {
  "@capsuletech/web-core": "workspace:*",
  "@capsuletech/web-ui": "workspace:*"
},
"peerDependencies": { "solid-js": "^1.9.12" },
"devDependencies": {
  "@capsuletech/lib-builder": "workspace:*",
  "@capsuletech/vite-builder": "workspace:*",
  "@solidjs/testing-library": "<сверь с root>",
  "@testing-library/jest-dom": "^6.9.1",
  "jsdom": "~29.1.1",
  "vite-plugin-solid": "^2.11.12"
}
```

exports: `.`, `./core`, `./lesson`, `./exercise`, `./progress`, `./library`, `./guides`, `./sentence-builder`, `./welcome`, `./controllers`, `./capsule` — точь-в-точь по studio-паттерну (`types`+`import`+`default`, dist/<entry>.mjs; для папок-entry `dist/<name>/index.d.ts`). Черновик architect'а уже содержит это — сверь.

## `vite.config.mts`

```ts
import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    lesson: 'src/lesson/index.ts',
    exercise: 'src/exercise/index.ts',
    progress: 'src/progress/index.ts',
    library: 'src/library/index.ts',
    guides: 'src/guides/index.ts',
    'sentence-builder': 'src/sentence-builder/index.ts',
    welcome: 'src/welcome/index.ts',
    controllers: 'src/controllers/index.ts',
    capsule: 'src/capsule.ts',
  },
  name: 'CapsuleWebLearn',
});
```

## `tsconfig.json`, `project.json`, `vitest.config.ts`, `vitest.setup.ts`

Скопируй из studio 1-в-1, поменяв имя пакета на `@capsuletech/web-learn` / путь `packages/web/learn/src` / `CapsuleWebLearn`. (`tsconfig.json` = `{ "extends": "../../../tsconfig.base.json", "include": ["src", "vite.config.mts"] }`.) `vitest.setup.ts` — те же matchMedia+ResizeObserver полифилы что в studio.

## `src/core/interfaces.ts`

```ts
/**
 * @capsuletech/web-learn/core — доменные контракты обучающего flow.
 *
 * UI-блоки пакета generic относительно модуля learn-бэка: <LessonView>
 * показывает любой concept, <Exercise> рендерит любой тип. Контент и логика
 * приходят с backend/learn (ADR 055) — здесь только формы данных.
 *
 * SKELETON: контракты-плейсхолдеры, уточнятся при backend-интеграции.
 */
export type ExerciseType = 'fill-blank' | 'build-clause' | 'fix-type-error' | 'translate';

export interface IConcept {
  id: string;
  title: string;
  /** TS-аналогия из брифа grammar-as-types (напр. "new vs reference"). */
  tsAnalogy?: string;
  prerequisites: string[];
  body?: string;
  exercises: ExerciseType[];
}

export interface IExercise {
  id: string;
  type: ExerciseType;
  prompt: string;
  answer?: string;
}

export interface IProgressEntry {
  conceptId: string;
  /** Leitner box (1..N). */
  box: number;
  lastReviewed?: string;
}

export interface ISkillNode {
  conceptId: string;
  title: string;
  unlocked: boolean;
  children: ISkillNode[];
}
```

## `src/core/provider.tsx`

```tsx
/**
 * Learn.Provider — тонкий провайдер верхнего уровня обучающего flow
 * (зеркало WebStudio.Provider). Будущий дом для learn-контекста (apiBase,
 * текущий модуль, кэш контента). В скелете тело — passthrough; контекст
 * появится при backend-интеграции (ADR 055 D2 — endpoints через web-query).
 *
 * Регистрируется как `Learn.Provider` через `../capsule` (ADR 033).
 */
import type { JSX } from 'solid-js';

export interface ILearnProviderProps {
  /** База learn-BFF (ADR 055). На скелете не используется. */
  apiBase?: string;
  children: JSX.Element;
}

export const LearnProvider = (props: ILearnProviderProps): JSX.Element => <>{props.children}</>;
```

## `src/core/index.ts`

```ts
export * from './interfaces';
export { LearnProvider, type ILearnProviderProps } from './provider';
```

## `src/lesson/*`

Все четыре — корректный TSX, тело-плейсхолдер с `data-stub`, текст через `@capsuletech/web-ui/typography`.

`LessonView.tsx`:
```tsx
import { Typography } from '@capsuletech/web-ui/typography';
import type { Component } from 'solid-js';

export interface ILessonViewProps {
  conceptId: string;
}

export const LessonView: Component<ILessonViewProps> = (props) => (
  <div data-stub="Learn.LessonView">
    <Typography variant="h2">LessonView</Typography>
    <Typography tone="muted">concept: {props.conceptId}</Typography>
  </div>
);
```

`Concept.tsx` (props `{ id: string; title?: string }`), `CodeBlock.tsx` (props `{ code: string; lang?: string }` → `<pre data-stub="Learn.CodeBlock"><code>{props.code}</code></pre>`), `TypeError.tsx` (export `TypeErrorBadge`, props `{ message: string }`) — по тому же шаблону. Каждый со своим `data-stub`.

`index.ts`:
```ts
export { LessonView, type ILessonViewProps } from './LessonView';
export { Concept, type IConceptProps } from './Concept';
export { CodeBlock, type ICodeBlockProps } from './CodeBlock';
export { TypeErrorBadge, type ITypeErrorProps } from './TypeError';
```

## `src/exercise/*`

`Exercise.tsx` — dispatch по `type` через Solid `Switch`/`Match`:
```tsx
import { Typography } from '@capsuletech/web-ui/typography';
import { type Component, Match, Switch } from 'solid-js';
import type { ExerciseType } from '../core';
import { BuildClause } from './BuildClause';
import { FillBlank } from './FillBlank';
import { FixTypeError } from './FixTypeError';
import { Translate } from './Translate';

export interface IExerciseProps {
  type: ExerciseType;
  conceptId?: string;
}

export const Exercise: Component<IExerciseProps> = (props) => (
  <div data-stub="Learn.Exercise">
    <Switch fallback={<Typography tone="muted">unknown exercise</Typography>}>
      <Match when={props.type === 'fill-blank'}><FillBlank /></Match>
      <Match when={props.type === 'build-clause'}><BuildClause /></Match>
      <Match when={props.type === 'fix-type-error'}><FixTypeError /></Match>
      <Match when={props.type === 'translate'}><Translate /></Match>
    </Switch>
  </div>
);
```

`FillBlank/BuildClause/FixTypeError/Translate` — каждый `Component<{}>` (или с минимальными props), тело `<div data-stub="Learn.Exercise.FillBlank"><Typography tone="muted">fill-blank stub</Typography></div>` и т.п.

`index.ts`: export Exercise + 4 под-типа.

## `src/progress/*`

`Progress.tsx` (props `{ entries?: IProgressEntry[] }`), `SkillTree.tsx` (props `{ root?: ISkillNode }`) — плейсхолдеры с Typography. `index.ts` экспортит оба + типы.

## `src/library/*`

`VocabList.tsx` (props `{ words?: string[] }`). `BookmarkButton.tsx` — используй `@capsuletech/web-ui/button` (`import { Button } from '@capsuletech/web-ui/button'`), props `{ word: string; bookmarked?: boolean }`, тело `<Button data-stub="Learn.BookmarkButton">{props.bookmarked ? '★' : '☆'} {props.word}</Button>`. Если у Button обязателен variant — поставь дефолтный из его interfaces. `index.ts` экспортит оба.

## `src/guides/*`

`Tour.tsx` (props `{ guideId?: string }`), `Step.tsx` (props `{ index?: number; label?: string }`), `Spotlight.tsx` (props `{ targetId?: string }`), `Hint.tsx` (props `{ text?: string }`) — плейсхолдеры. `index.ts` экспортит все 4.

## `src/sentence-builder/*`

`SentenceBuilder.tsx` (props `{ words?: string[] }`) — плейсхолдер. `index.ts` экспортит.

## `src/welcome/*` — ВАЖНО: зеркало studio Welcome, настоящий `useEmit`

`segments.ts`:
```ts
export type LearnSegmentId = 'lessons' | 'exercises' | 'progress' | 'library';

export interface ILearnSegment {
  id: LearnSegmentId;
  label: string;
  description: string;
}

export const LEARN_SEGMENTS: ILearnSegment[] = [
  { id: 'lessons', label: 'Lessons', description: 'Концепты и теория' },
  { id: 'exercises', label: 'Exercises', description: 'Упражнения' },
  { id: 'progress', label: 'Progress', description: 'Прогресс и навыки' },
  { id: 'library', label: 'Library', description: 'Словарь и закладки' },
];
```

`types.ts`:
```ts
export interface IWelcomeProps {
  title?: string;
  description?: string;
  hint?: string;
}

export const DEFAULT_TITLE = 'Learn';
export const DEFAULT_DESCRIPTION = 'Выберите раздел, чтобы начать обучение.';
export const DEFAULT_HINT = 'Контент придёт с backend/learn (ADR 055).';
```

`Welcome.tsx` — **точная калька `studio/src/welcome/Welcome.tsx`** (тот же `useEmit`, тот же phantom `__events`, те же Card/Layout/Typography), только сегменты learn'овские:
```tsx
/**
 * Learn.Welcome — landing/index-fallback обучающего app'а (зеркало WebStudio.Welcome).
 *
 * Tier-2 connected: обычный Solid-компонент (НЕ Controller-обёртка), рендерится
 * ВНУТРИ родительского HCA-контекста (root-Feature app'а) и эмитит `onNavigate`
 * через `useEmit` — идентичный паттерн studio. App-Feature ловит onNavigate.
 *
 * Phantom `__events?: IWelcomeEvents` → codegen `Learn.Welcome.Events`.
 */
import { useEmit } from '@capsuletech/web-core';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For } from 'solid-js';
import { type LearnSegmentId, LEARN_SEGMENTS } from './segments';
import { DEFAULT_DESCRIPTION, DEFAULT_HINT, DEFAULT_TITLE, type IWelcomeProps } from './types';

export interface IWelcomeEvents {
  /** ID сегмента карточки ('lessons' | 'exercises' | 'progress' | 'library'). */
  onNavigate: LearnSegmentId;
}

const WelcomeComponent = (props: IWelcomeProps) => {
  const emit = useEmit();
  const title = () => props.title ?? DEFAULT_TITLE;
  const description = () => props.description ?? DEFAULT_DESCRIPTION;
  const hint = () => props.hint ?? DEFAULT_HINT;

  return (
    <Layout.Flex orientation="vertical" align="center" justify="center" gapY={8} h="full" class="p-12">
      <Layout.Flex orientation="vertical" gapY={4} align="center" maxW={160}>
        <Typography variant="h1" size="4xl" align="center">{title()}</Typography>
        <Typography tone="muted" size="lg" align="center">{description()}</Typography>
      </Layout.Flex>

      <Layout.Flex orientation="horizontal" gapX={4} justify="center" maxW={200}>
        <For each={LEARN_SEGMENTS}>
          {(seg) => (
            <Card
              role="button"
              tabIndex={0}
              class="cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => emit('onNavigate', { source: 'Learn.Welcome', payload: seg.id })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  emit('onNavigate', { source: 'Learn.Welcome', payload: seg.id });
                }
              }}
            >
              <Card.Header>
                <Card.Title>{seg.label}</Card.Title>
                <Card.Description>{seg.description}</Card.Description>
              </Card.Header>
            </Card>
          )}
        </For>
      </Layout.Flex>

      <Typography tone="muted" size="sm">{hint()}</Typography>
    </Layout.Flex>
  );
};

export const Welcome: ((props: IWelcomeProps) => any) & {
  readonly __events?: IWelcomeEvents;
} = WelcomeComponent;
```

`index.ts`:
```ts
export { Welcome, type IWelcomeEvents } from './Welcome';
export { type IWelcomeProps } from './types';
export { LEARN_SEGMENTS, type ILearnSegment, type LearnSegmentId } from './segments';
```

## `src/controllers/index.ts`

```ts
// Controllers.Learn — гнездо ADR 032 (useEmit-канал доменных событий обучения).
// SKELETON: пусто. Контроллер появится при наполнении (валидация exercise,
// progress-апдейты и т.п. — оркеструются через backend/learn, ADR 055 D2).
export {};
```

## `src/capsule.ts` — регистрация `Learn.*` (ADR 033)

```ts
/**
 * @capsuletech/web-learn/capsule — манифест пакета для регистрации (ADR 033).
 *
 * App подключает: `packages: ['@capsuletech/web-learn']` в capsule.app.ts →
 * CapsuleRegistryPlugin генерит глобалы Learn.*:
 *   Learn.Provider | Learn.Welcome | Learn.LessonView | Learn.Exercise |
 *   Learn.Progress | Learn.VocabList | Learn.Tour | Learn.SentenceBuilder
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { LearnProvider } from './core';
import { Exercise } from './exercise';
import { Tour } from './guides';
import { VocabList } from './library';
import { LessonView } from './lesson';
import { Progress } from './progress';
import { SentenceBuilder } from './sentence-builder';
import { Welcome } from './welcome';

export default defineCapsuleModule({
  name: 'Learn',
  components: {
    Provider: LearnProvider,
    Welcome,
    LessonView,
    Exercise,
    Progress,
    VocabList,
    Tour,
    SentenceBuilder,
  },
});
```

## `src/index.ts`

```ts
// Корневой barrel — реэкспортит framework-agnostic core (контракты + типы).
// Connected-блоки (LessonView / Exercise / Welcome / Provider / ...) подключаются
// как глобалы `Learn.*` через `@capsuletech/web-learn/capsule` (ADR 033),
// а не импортятся напрямую.
export * from './core';
```

## `src/__tests__/smoke.test.tsx`

Покрытие как у studio — рендерим pure-display плейсхолдеры (Welcome НЕ тестим bare: его `useEmit` требует Controller-контекст; это ОК, studio Welcome тоже не покрыт unit-тестом):

```tsx
import { render } from '@solidjs/testing-library';
import { describe, expect, test } from 'vitest';
import { Exercise } from '../exercise';
import { Tour } from '../guides';
import { VocabList } from '../library';
import { LessonView } from '../lesson';
import { Progress } from '../progress';
import { SentenceBuilder } from '../sentence-builder';

describe('web-learn skeleton smoke', () => {
  test('LessonView renders', () => {
    const { container } = render(() => <LessonView conceptId="lang.en_US.articles" />);
    expect(container.querySelector('[data-stub="Learn.LessonView"]')).toBeTruthy();
  });
  test('Exercise dispatches by type', () => {
    const { container } = render(() => <Exercise type="fill-blank" />);
    expect(container.querySelector('[data-stub="Learn.Exercise"]')).toBeTruthy();
  });
  test('Progress renders', () => {
    const { container } = render(() => <Progress />);
    expect(container.querySelector('[data-stub="Learn.Progress"]')).toBeTruthy();
  });
  test('VocabList renders', () => {
    const { container } = render(() => <VocabList />);
    expect(container.querySelector('[data-stub="Learn.VocabList"]')).toBeTruthy();
  });
  test('Tour renders', () => {
    const { container } = render(() => <Tour />);
    expect(container.querySelector('[data-stub="Learn.Tour"]')).toBeTruthy();
  });
  test('SentenceBuilder renders', () => {
    const { container } = render(() => <SentenceBuilder />);
    expect(container.querySelector('[data-stub="Learn.SentenceBuilder"]')).toBeTruthy();
  });
});
```

## `OWNERSHIP.md`

По `docs/_meta/OWNERSHIP-template.md`. Frontmatter: `name: "@capsuletech/web-learn"`, `owner-agent: owner-web-learn` (будущий — агент появится отдельным PR; пока зона без активного owner, изменения через scoped learn-сессию), `group: web_base`, `zone: learn` (новая top-level зона, ADR 055 D5 / ADR 047), `status: skeleton`, `priority: P2`. В теле: состояние `SKELETON (0.0.0)`, vendor-stack (web-core, web-ui, solid peer), список subpath'ов с одной строкой-описанием на каждый, и Roadmap (наполнение модулей реальными UI + backend-интеграция через web-query — последующие итерации).

## `README.md`

Короткий: что это (top-level learn-зона, ADR 055), subpath-список, статус skeleton, как собрать (`pnpm --filter @capsuletech/web-learn build`).

# Acceptance (прогнать перед commit, last-lines в отчёт architect'у)

- `pnpm --filter @capsuletech/web-learn build` — успешно; в `dist/` есть `.mjs` + `.d.ts` для каждой из 11 entry.
- `pnpm --filter @capsuletech/web-learn typecheck` (или `tsc --noEmit`) — без ошибок.
- `pnpm --filter @capsuletech/web-learn test` — smoke зелёные.
- `pnpm exec nx graph` — `@capsuletech/web-learn` виден, зависит от `web-core`, `web-ui`.

# Что НЕ делаем (скелет!)

- Реальные UI / реальная логика модулей — НЕТ, только плейсхолдеры.
- Backend-интеграция (`web-query` endpoints к `/learn/*`) — НЕТ.
- Реализация Controllers.Learn (useEmit-эмиссия доменных событий) — гнездо стоит пустым.
- `tsconfig.base.json` paths и `optimizeDeps.exclude` — НЕ твоё (architect + owner-builders).
- App `apps/learn/` — НЕ твоё (architect).
- Storybook / стилизация темой / sentence-builder реальная механика — НЕТ.

# После твоего commit

Architect добавит `tsconfig.base.json` paths (11 subpath'ов) + поднимет apps/learn; owner-builders добавит `@capsuletech/web-learn` в `optimizeDeps.exclude` + ребилд vite-builder. Затем — связка app↔package, верификация в браузере, и USER скажет следующий шаг.
