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
`Learn.Provider` · `Learn.Welcome` · `Learn.Exercise` · `Learn.Progress` · `Learn.Tour` · `Learn.SentenceBuilder` · `Learn.LibraryNav` · `Learn.LessonsNav` · `Learn.LessonsWelcome` · `Learn.LibraryWelcome` · `Learn.Collections` · `Learn.Words` · `Learn.Search` · `Learn.Markdown` · `Learn.Library.{Info}` · `Learn.Lessons.{List,View,Concepts,Concept,Rules,Rule,RuleDrills}`.

## Анатомия `src/` (core / shared / modules)

- **`core/`** — cross-cutting инфра (provider / apiContext / interfaces / controllers).
- **`shared/`** — переиспользуемые **атомы** (`words/` · `search/` · `markdown/`). Не собственность фиче-модуля: модуль **композирует** атом, не хардкодит его в себе.
- **`modules/`** — фиче-композиты (`lessons/` · `library/` · `exercise/` · …), импортят атомы из `shared/`.
- **Направление строгое: `modules/ → shared/`, НИКОГДА `shared/ → modules/`.**

## Subpath exports

- `./core` — доменные контракты (`IConcept`/`IExercise`/`IProgressEntry`/`ISkillNode`) + `LearnProvider`.
- `./words` — атом слова: `Words`-грид + `WordTile` + `wordsStore` + `fetchSenses` + `ISense`.
- `./search` — атом поиска слов: `Search` (пишет `wordsStore`).
- `./markdown` — атом рендера markdown: `Markdown` (`renderMarkdown` → `Prose`, strip-H1 + wikilink).
- `./lessons` — раздел Lessons: `List` / `View` / `Concepts` / `Concept` / `Rules` / `Rule` / `RuleDrills` + `lessonsStore`.
- `./exercise` — `Exercise` (dispatch по type) + 4 под-типа.
- `./progress` — `Progress` / `SkillTree`.
- `./library` — library-view-концерны: `Info` (деталь выбранного слова, читает `wordsStore` из `shared/words`) / `Collections` / `BookmarkButton` + `LIBRARY_SEGMENTS`-типы. `Words`/`Search` промоутнуты в `shared/`.
- `./guides` — `Tour` / `Step` / `Spotlight` / `Hint`.
- `./sentence-builder` — `SentenceBuilder`.
- `./welcome` — данные сегментов (`LEARN_SEGMENTS`/`ILearnSegment`/`LearnSegmentId`).
- `./controllers` — гнездо `Controllers.Learn` (ADR 032), пока пусто.
- `./capsule` — capsule manifest (ADR 033).

## Build

```bash
pnpm --filter @capsuletech/web-learn build
```

Multi-entry: `index` + `core` + `lessons` + `exercise` + `progress` + `library` + `guides` + `sentence-builder` + `welcome` + `words` + `search` + `markdown` + `controllers` + `capsule` (14 entry).

## Test

```bash
pnpm --filter @capsuletech/web-learn test
```
