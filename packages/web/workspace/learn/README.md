# @capsuletech/web-learn

Доменный пакет обучающего flow capsule — уроки, упражнения, прогресс, словарь, гайды.  ·  zone: **learn**  ·  status: **skeleton (0.0.0)**

> Top-level `learn` зона (ADR 055 D5). Полное архитектурное зеркало [`@capsuletech/web-studio`](../studio/), домен — обучение. Текущая итерация — **скелет**: структура/конвенции/регистрация/build «по-взрослому», тела компонентов — плейсхолдеры (`data-stub`). Наполнение + backend-интеграция — последующие итерации. См. [OWNERSHIP.md](./OWNERSHIP.md).

## Install

```bash
pnpm add @capsuletech/web-learn
# peer:
pnpm add solid-js
```

## Подключение в app (ADR 033)

```ts
// capsule.app.ts
packages: ['@capsuletech/web-learn']
```

После регистрации доступны глобалы `Learn.*`:
`Learn.Provider` · `Learn.Welcome` · `Learn.LessonView` · `Learn.Exercise` · `Learn.Progress` · `Learn.VocabList` · `Learn.Tour` · `Learn.SentenceBuilder` · `Learn.LibraryNav` · `Learn.LibraryWelcome` · `Learn.Collections` · `Learn.Library.{Search,Words,Info}`.

## Subpath exports

- `./core` — доменные контракты (`IConcept`/`IExercise`/`IProgressEntry`/`ISkillNode`) + `LearnProvider`.
- `./lesson` — `LessonView` / `Concept` / `CodeBlock` / `TypeErrorBadge`.
- `./exercise` — `Exercise` (dispatch по type) + 4 под-типа.
- `./progress` — `Progress` / `SkillTree`.
- `./library` — `Search` / `Words` / `Info` (реальный library-браузер + `libraryStore`) / `LibraryWelcome` (landing раздела) / `Navigation` (под-навигация explorer↔collections, useEmit `onLibraryNavigate`) / `Collections` / `VocabList` / `BookmarkButton`.
- `./guides` — `Tour` / `Step` / `Spotlight` / `Hint`.
- `./sentence-builder` — `SentenceBuilder`.
- `./welcome` — `Welcome` (tier-2 connected, useEmit `onNavigate`) + `LEARN_SEGMENTS`.
- `./controllers` — гнездо `Controllers.Learn` (ADR 032), пока пусто.
- `./capsule` — capsule manifest (ADR 033).

## Build

```bash
pnpm --filter @capsuletech/web-learn build
```

Multi-entry: `index` + `core` + `lesson` + `exercise` + `progress` + `library` + `guides` + `sentence-builder` + `welcome` + `controllers` + `capsule` (11 entry).

## Test

```bash
pnpm --filter @capsuletech/web-learn test
```
