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
`Learn.Provider` · `Learn.Nav.{Main,Library,Lessons}` · `Learn.Welcome.{Root,Library,Lessons}` · `Learn.Exercise` · `Learn.Progress` · `Learn.Tour` · `Learn.SentenceBuilder` · `Learn.Collections` · `Learn.Words` · `Learn.Search` · `Learn.Markdown` · `Learn.Library.{Info}` · `Learn.Lesson` · `Learn.Lessons` · `Learn.Concept` · `Learn.Concepts` · `Learn.Rule` · `Learn.Rules` · `Learn.RuleDrills`.

## Анатомия `src/` (core / shared / modules)

- **`core/`** — cross-cutting инфра (provider / apiContext / interfaces / controllers).
- **`shared/`** — переиспользуемые **атомы** (`words/` · `search/` · `markdown/` · `segments/`). Не собственность фиче-модуля: модуль **композирует** атом, не хардкодит его в себе.
- **`modules/`** — фиче-композиты (`lessons/` · `library/` · `navigation/` · `welcome/` · `exercise/` · …), импортят атомы из `shared/`.
- **Направление строгое: `modules/ → shared/`, НИКОГДА `shared/ → modules/`.**

## Subpath exports

- `./core` — доменные контракты (`IConcept`/`IExercise`/`IProgressEntry`/`ISkillNode`) + `LearnProvider`.
- `./words` — атом слова: `Words`-грид + `WordTile` + `wordsStore` + `fetchSenses` + `ISense`.
- `./search` — атом поиска слов: `Search` (пишет `wordsStore`).
- `./markdown` — атом рендера markdown: `Markdown` (`renderMarkdown` → `Prose`, strip-H1 + wikilink).
- `./lessons` — барель lessons-домена: `Lesson` / `Lessons` / `Concept` / `Concepts` / `Rule` / `Rules` / `RuleDrills` + сторы + `LESSONS_SEGMENTS`-типы.
- `./exercise` — `Exercise` (dispatch по type) + 4 под-типа.
- `./progress` — `Progress` / `SkillTree`.
- `./library` — library-view-концерны: `Info` (деталь выбранного слова, читает `wordsStore` из `shared/words`) / `Collections` / `BookmarkButton` + `LIBRARY_SEGMENTS`-типы. `Words`/`Search` промоутнуты в `shared/`.
- `./guides` — `Tour` / `Step` / `Spotlight` / `Hint`.
- `./sentence-builder` — `SentenceBuilder`.
- `./welcome` — welcome-лаунчеры (`Root`/`Lessons`/`Library` → `Learn.Welcome.*`) + реэкспорт main-сегментов (`MAIN_SEGMENTS`/`IMainSegment`/`MainSegmentId`). Nav-блоки (`Learn.Nav.*`) регистрируются через `capsule.tsx`, отдельного субпата у `modules/navigation` нет.
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
