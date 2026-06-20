---
title: Foundation 05 — packages/web/learn/ skeleton (top-level zone, subpath multi-entry)
status: ready
audience: general-purpose agent (commit-only, без push)
last_updated: 2026-06-20
depends_on: [foundation-00]
unlocks: [foundation-06]
adr_refs: [055, 047, 033]
---

# Контекст

ADR 055 D5: `packages/web/learn/` — **top-level фронт-зона** (рядом с `web/studio/`, `web/runtime/`, `web/domain/`, `web/kit/`, `web/boost/`). Расширяемая экосистема UI-блоков для обучающего flow.

Структура subpath'ов параллельна с `web/studio/`: разные блоки в разных entry-точках, multi-entry Vite-build, типы через `@types`.

Этот бриф — **skeleton с stub-компонентами**, не реальная реализация. Финальные UI-блоки и интеграция с `backend/learn/` через `web-query` — последующие PR.

# Scope

Создать `packages/web/learn/` со всей subpath-структурой, multi-entry build, регистрация под `Learn.*` per ADR 033.

Работа **напрямую в `main`**. Без ветки. Commit-only **без push**.

# Структура

```
packages/web/learn/
├── package.json                    ← name "@capsuletech/web-learn", multi-entry exports
├── tsconfig.json
├── vite.config.mts                 ← multi-entry для subpath'ов
├── README.md
├── OWNERSHIP.md                    ← по шаблону docs/_meta/OWNERSHIP-template.md
├── project.json
└── src/
    ├── index.ts                    ← пустой / re-export core (см. studio как образец)
    ├── core/
    │   ├── index.ts
    │   ├── interfaces.ts           ← Lesson, Concept, Exercise, Progress contracts
    │   └── provider.tsx            ← <Learn.Provider apiBase="...">
    ├── lesson/
    │   ├── index.ts
    │   ├── LessonView.tsx          ← <LessonView concept={...}> stub
    │   ├── Concept.tsx             ← stub
    │   ├── CodeBlock.tsx           ← stub (для TS-аналогий из бриф'а grammar-as-types)
    │   └── TypeError.tsx           ← badge "type error" stub
    ├── exercise/
    │   ├── index.ts
    │   ├── Exercise.tsx            ← <Exercise type={...}> dispatch на под-типы
    │   ├── FillBlank.tsx           ← stub
    │   ├── BuildClause.tsx         ← stub
    │   ├── FixTypeError.tsx        ← stub
    │   └── Translate.tsx           ← stub
    ├── progress/
    │   ├── index.ts
    │   ├── Progress.tsx            ← <Progress concepts={...}> stub
    │   └── SkillTree.tsx           ← stub
    ├── library/
    │   ├── index.ts
    │   ├── VocabList.tsx           ← stub
    │   └── BookmarkButton.tsx      ← stub
    ├── guides/
    │   ├── index.ts
    │   ├── Tour.tsx                ← stub
    │   ├── Step.tsx                ← stub
    │   ├── Spotlight.tsx           ← stub
    │   └── Hint.tsx                ← stub
    ├── sentence-builder/
    │   ├── index.ts
    │   └── SentenceBuilder.tsx     ← stub (specific под grammar-as-types)
    ├── controllers/
    │   ├── index.ts
    │   └── Learn.ts                ← Controllers.Learn per ADR 032 (useEmit)
    └── capsule/
        ├── index.ts                ← регистрирует Learn.* per ADR 033
        └── register.ts
```

# package.json — exports

```jsonc
{
  "name": "@capsuletech/web-learn",
  "version": "0.0.0",
  "type": "module",
  "private": false,
  "exports": {
    ".": { "import": "./dist/index.mjs", "types": "./dist/index.d.ts" },
    "./core": { "import": "./dist/core.mjs", "types": "./dist/core.d.ts" },
    "./lesson": { "import": "./dist/lesson.mjs", "types": "./dist/lesson.d.ts" },
    "./exercise": { "import": "./dist/exercise.mjs", "types": "./dist/exercise.d.ts" },
    "./progress": { "import": "./dist/progress.mjs", "types": "./dist/progress.d.ts" },
    "./library": { "import": "./dist/library.mjs", "types": "./dist/library.d.ts" },
    "./guides": { "import": "./dist/guides.mjs", "types": "./dist/guides.d.ts" },
    "./sentence-builder": { "import": "./dist/sentence-builder.mjs", "types": "./dist/sentence-builder.d.ts" },
    "./controllers": { "import": "./dist/controllers.mjs", "types": "./dist/controllers.d.ts" },
    "./capsule": { "import": "./dist/capsule.mjs", "types": "./dist/capsule.d.ts" }
  },
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "solid-js": "*"
  },
  "dependencies": {
    "@capsuletech/web-core": "workspace:*",
    "@capsuletech/web-ui": "workspace:*",
    "@capsuletech/web-query": "workspace:*"
  }
}
```

# vite.config.mts — multi-entry

Аналогично `packages/web/studio/vite.config.mts`. Все subpath'ы как отдельные entries:

```ts
import { defineConfig } from 'vite';
import { libConfig } from '@capsuletech/lib-builder';

export default defineConfig(
  libConfig({
    entry: {
      index: 'src/index.ts',
      core: 'src/core/index.ts',
      lesson: 'src/lesson/index.ts',
      exercise: 'src/exercise/index.ts',
      progress: 'src/progress/index.ts',
      library: 'src/library/index.ts',
      guides: 'src/guides/index.ts',
      'sentence-builder': 'src/sentence-builder/index.ts',
      controllers: 'src/controllers/index.ts',
      capsule: 'src/capsule/index.ts',
    },
  }),
);
```

# tsconfig.base.json — alias

Добавить:
```jsonc
"@capsuletech/web-learn": ["packages/web/learn/src/index.ts"],
"@capsuletech/web-learn/core": ["packages/web/learn/src/core/index.ts"],
"@capsuletech/web-learn/lesson": ["packages/web/learn/src/lesson/index.ts"],
// ...все subpath'ы
```

И в `optimizeDeps.exclude` в `packages/builders/vite/src/defines/capsuleConfig.ts` — добавить `@capsuletech/web-learn` (+ subpath'ы по необходимости).

**Watch out:** после правки `capsuleConfig.ts` обязательно пересобрать vite-builder (`pnpm --filter @capsuletech/vite-builder build`) — иначе dev-server в apps не подхватит.

# Stub-компоненты

Все компоненты — корректный TSX с правильной типизацией props (по interfaces), JSX-тело:

```tsx
import { Component } from 'solid-js';

export interface ILessonViewProps {
  conceptId: string;
}

export const LessonView: Component<ILessonViewProps> = (props) => {
  return (
    <div data-stub="Learn.LessonView">
      LessonView stub — concept {props.conceptId}
    </div>
  );
};
```

# capsule/register.ts — ADR 033

```ts
import * as Lesson from '../lesson';
import * as Exercise from '../exercise';
import * as Progress from '../progress';
import * as Library from '../library';
import * as Guides from '../guides';
import * as SentenceBuilder from '../sentence-builder';

export const Learn = {
  ...Lesson,
  ...Exercise,
  ...Progress,
  ...Library,
  ...Guides,
  ...SentenceBuilder,
};
```

Регистрация в global'е — через `defineCapsuleModule` (см. как сделано в `packages/web/runtime/remote/src/capsule.ts` и `packages/web/domain/auth/src/capsule.ts`).

# Tests

Минимум по 1 smoke-теста на каждую subpath точку — компонент рендерится, не падает:

```ts
import { render } from '@solidjs/testing-library';
import { LessonView } from '../src/lesson';

test('LessonView renders', () => {
  const { container } = render(() => <LessonView conceptId="x" />);
  expect(container.textContent).toContain('LessonView stub');
});
```

# OWNERSHIP.md

По шаблону `docs/_meta/OWNERSHIP-template.md`. Status: `SKELETON (0.0.0)`. Owner: `owner-web-learn` (будущий, появится отдельным PR — пока зона **без активного owner-агента**, любые изменения идут через main session или general-purpose).

# Acceptance

- `pnpm --filter @capsuletech/web-learn build` — успешно, dist/ содержит .mjs + .d.ts для каждой entry.
- `pnpm --filter @capsuletech/web-learn typecheck` — без ошибок.
- `pnpm --filter @capsuletech/web-learn test` — smoke зелёные.
- `pnpm exec nx graph` — `@capsuletech/web-learn` виден, зависит от `web-core`, `web-ui`, `web-query`.
- В `apps/playground` (как тестовая площадка) — `import { LessonView } from '@capsuletech/web-learn/lesson'` резолвится, рендерится.
- `Learn.LessonView` доступен как global в HCA-app (через unplugin-auto-import / ADR 033 registration).

# Что НЕ делаем

- Реальные UI (рабочие LessonView/Exercise/Progress/Tour) — НЕТ. Только stub'ы.
- Интеграция с `backend/learn/` через `web-query` endpoints — НЕТ. Это последующий PR (после реализации backend/learn endpoints выше mock-уровня).
- ADR 032 useEmit реализация Controllers.Learn — гнездо стоит, эмиссия событий не настраивается.
- ThemeSwitcher / стилизация — нет (web-style используется когда appearance стабилизируется).
- Storybook — НЕТ на скелете.

# Дальше

После мержа `apps/learn/` (foundation-06) сможет импортировать `Learn.*` и собрать первый layout.
