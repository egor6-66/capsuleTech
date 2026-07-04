---
name: "@capsuletech/web-learn"
owner-agent: owner-web-learn
group: web_base
zone: learn
status: skeleton
priority: P2
last-updated: 2026-07-04
---

# @capsuletech/web-learn

Доменный пакет обучающего flow capsule — уроки, упражнения, прогресс, словарь, гайды (зеркало архитектуры `@capsuletech/web-studio`, домен — обучение).

## Состояние (читать ПЕРВЫМ)

- **Zone:** `learn` (новая top-level зона, ADR 055 D5 / ADR 047). Единственный пакет в зоне; зона существует как slot для обучающего домена.
- **Status:** `skeleton` (0.0.0) — структура, конвенции, регистрация, multi-entry build, smoke-тесты «по-взрослому» как в studio, но **тела компонентов — плейсхолдеры** (`data-stub`, никакой реальной логики/бэкенда), **КРОМЕ `library/*` (Search/Words/Info)** — реальный UI + реальный backend-fetch, перенесены из `apps/learn` (brief `learn-library-block-migration.md`, 2026-07-04). Остальные модули (lesson/exercise/progress/guides/sentence-builder) — по-прежнему плейсхолдеры.
- **Priority:** **P2** — фундамент под обучающий app; наполнение и backend-интеграция — последующие итерации.
- **Maturity bar (→ alpha):**
  - Реальный UI остальных модулей (lesson/exercise/progress/guides/sentence-builder) вместо плейсхолдеров — `library` уже реальный.
  - `Controllers.Learn` реализован (валидация exercise, progress-апдейты) через useEmit (ADR 032).
  - Backend-интеграция остальных модулей: `web-query` endpoints к `/learn/*` (ADR 055 D2) — `library` уже ходит на backend напрямую через `fetch` (см. Quirks).
  - app `apps/learn/` связан с пакетом, верификация в браузере (library-блоки — коллапс страницы на блоки, отдельный бриф owner-apps).
- **Active blockers:** owner-agent `owner-web-learn` ещё не создан (появится отдельным PR). Пока зона ведётся через scoped `learn`-сессию.
- **Last activity:** 2026-07-04 (library-блок migration: store/api/Search/Words/Info из apps/learn, brief `learn-library-block-migration.md`).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@capsuletech/web-core`** (workspace, dep) — HCA: `useEmit`/`useEmitOptional` (Welcome → `onNavigate`, LibraryNav → `onLibraryNavigate`, library `Words`/`Info` → `onWordSelect`/`onSpeak`), `defineCapsuleModule` (регистрация).
- **`@capsuletech/web-router`** (workspace, dep) — `useRouter().current()` для derived-active в `LibraryNav` (URL = single source of truth, как studio Navigation).
- **`@capsuletech/web-ui`** (workspace, dep) — chrome модулей (Typography / Card / Layout / Button / Group / Input / Toggle).

> `@capsuletech/web-query` добавится при backend-интеграции остальных модулей — сейчас НЕ зависимость. `library/api.ts` ходит на backend напрямую нативным `fetch` (не через web-query) — см. Quirks.

## Зона ответственности

### Owns
- `packages/web/learn/src/` (полностью)
- `packages/web/learn/vite.config.mts`
- `packages/web/learn/package.json` exports / deps

### Не трогает
- Содержимое других `@capsuletech/*` пакетов (делегировать).
- `tsconfig.base.json` paths + `optimizeDeps.exclude` (architect + owner-builders).
- `apps/learn/` (framework-developer / architect scope).
- `scripts/release-local.mjs`, root `package.json`, `nx.json` (architect).

## Публичный API (subpaths)

| Subpath | Что внутри |
|---|---|
| `.` | barrel: framework-agnostic core (контракты + типы) |
| `./core` | доменные контракты (`IConcept`/`IExercise`/`IProgressEntry`/`ISkillNode`, `ExerciseType`) + `LearnProvider` |
| `./lesson` | `LessonView` / `Concept` / `CodeBlock` / `TypeErrorBadge` |
| `./exercise` | `Exercise` (dispatch по type) + `FillBlank`/`BuildClause`/`FixTypeError`/`Translate` |
| `./progress` | `Progress` / `SkillTree` |
| `./library` | **Реальный** library-браузер (перенесён из `apps/learn`, канон «пакет владеет стором» — см. Quirks): `Search` / `Words` / `Info` (регистрируются вложенно `Learn.Library.Search`/`.Words`/`.Info`) + `libraryStore` singleton (`load`/`select`/`selected`) + `fetchSenses` (`api.ts`) + `ISense` тип. Плюс прежние плейсхолдеры: `LibraryWelcome` (landing раздела, useEmit `onLibraryNavigate`) / `Navigation` (под-навигация, тот же `onLibraryNavigate`) / `Collections` / `VocabList` / `BookmarkButton`. Internal `LIBRARY_SEGMENTS` (не реэкспортится) |
| `./guides` | `Tour` / `Step` / `Spotlight` / `Hint` |
| `./sentence-builder` | `SentenceBuilder` |
| `./welcome` | `Welcome` (tier-2 connected, useEmit `onNavigate`) + `LEARN_SEGMENTS` |
| `./controllers` | гнездо `Controllers.Learn` (ADR 032) — пока пусто (`export {}`) |
| `./capsule` | `defineCapsuleModule({ name: 'Learn', components })` (ADR 033) |

Это **контракт**. Изменение публичного API = breaking change → coordinate с architect.

## Quirks / gotchas

- **`TypeError.tsx` экспортит `TypeErrorBadge`** — имя компонента намеренно не `TypeError`, чтобы не шадоуить global `TypeError`.
- **`Welcome` bare не юнит-тестируется** — его `useEmit` требует Controller-контекст (как и studio Welcome). `library` блоки (`Words`/`Info`) ЮНИТ-тестируются bare — используют `useEmitOptional` (non-throwing вне scope), мокнутый через `vi.mock('@capsuletech/web-core', ...)` (прецедент `Shell.Picker`).
- **Smoke рендерит через `solid-js/web`** (manual host + dispose), НЕ через `@solidjs/testing-library` — её в репо нет; эталон (studio) тестирует так же.
- **Multi-entry vite build** — все 11 subpaths обязаны присутствовать в `dist/`.
- **`controllers` гнездо пустое** — `Controllers.Learn` появится при наполнении.
- **`libraryStore` — Solid `createStore`-singleton, НЕ XState/Feature.** `@xstate/solid` несёт живой баг подмены строки массива на reconcile (brief `core-xstate-solid-reconcile-corruption.md`, охота отдельная, owner-core) — library-флоу от него не зависит намеренно (mandate user 2026-07-04).
- **`libraryStore.load(apiBase, q?)` — `apiBase` явный параметр, НЕ читается из контекста.** Стор — модуль-level singleton (Solid `createStore` вне component-scope), `useContext` внутри него невозможен. Компоненты (`Search`/`Words`) читают `apiBase` через `useApiBase()` (`core/apiContext.ts`, провайдится `Learn.Provider`) и передают его в `load` явно.
- **`Learn.Library` — вложенный namespace-блок** (`Learn.Library.Search`/`.Words`/`.Info`), а не плоские top-level ключи. `CapsuleRegistryPlugin`-codegen per-component `.Events` aggregate (`packages.d.ts`) статически парсит AST только ПЛОСКИХ ключей `components:` — вложенные `Library.*` в агрегат не попадают. `IWordsEvents`/`IInfoEvents` типизируются вручную прямым импортом из `@capsuletech/web-learn/library` (не через `Learn.Library.Words.Events`). Не мой фикс (owner-builders зона codegen) — задокументировано, не блокер.
- **Speaker-клик в `WordTile` вызывает `stopPropagation`** — без UiProxy dedup-механики app-слоя (пакетный компонент — голый Solid), клик на вложенной кнопке иначе всплывает и триггерит родительский `onSelect` на Card.

## План рефакторинга / оптимизаций

```markdown
- [x] Skeleton scaffold (структура + регистрация + smoke) — 2026-06-28.
- [x] `library` — реальный UI + store + backend-fetch (Search/Words/Info, перенос из `apps/learn`) — 2026-07-04.
- [ ] Наполнить остальные модули реальным UI (lesson/exercise/progress/guides/sentence-builder).
- [ ] Реализовать `Controllers.Learn` (useEmit-эмиссия доменных событий обучения).
- [ ] Backend-интеграция остальных модулей: `web-query` endpoints к `/learn/*` (ADR 055 D2).
- [ ] Создать owner-agent `owner-web-learn` (отдельный PR).
```

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit (smoke) | `src/__tests__/smoke.test.tsx` | рендер pure-display плейсхолдеров (LessonView/Exercise dispatch/Progress/VocabList/Tour/SentenceBuilder) |
| Unit | `library/__tests__/store.test.ts` | `load`/`select`/`selected`, select-миграция между id (регрессия к app-слой багу) |
| Unit | `library/__tests__/Search.test.tsx` | keystroke → `load(apiBase, q)`, `apiBase` из `Learn.Provider` / дефолт |
| Unit | `library/__tests__/Words.test.tsx` | lazy-load on mount, `data-selected` миграция по тайлам (регрессия), emit `onWordSelect`/`onSpeak` |
| Unit | `library/__tests__/Info.test.tsx` | fallback без selection, рендер выбранного sense, emit `onSpeak` |

**Перед изменением:** unit должны быть green (`pnpm --filter @capsuletech/web-learn test`).

## Cross-package dependencies

| Зона | Owner |
|---|---|
| HCA wrappers, useEmit, defineCapsuleModule | owner-web-core |
| UI primitives (Typography/Card/Layout/Button) | owner-web-ui |
| Vite plugins / lib-builder | owner-builders |
| API-слой (web-query endpoints) | owner-web-query |
| `tsconfig.base.json` paths, `optimizeDeps.exclude`, app | architect |

## Release group

- `web_base` — fixed group, tag `web@{version}`.

После изменений координировать release через architect.
