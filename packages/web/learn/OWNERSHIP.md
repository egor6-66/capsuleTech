---
name: "@capsuletech/web-learn"
owner-agent: owner-web-learn
group: web_base
zone: learn
status: skeleton
priority: P2
last-updated: 2026-06-28
---

# @capsuletech/web-learn

Доменный пакет обучающего flow capsule — уроки, упражнения, прогресс, словарь, гайды (зеркало архитектуры `@capsuletech/web-studio`, домен — обучение).

## Состояние (читать ПЕРВЫМ)

- **Zone:** `learn` (новая top-level зона, ADR 055 D5 / ADR 047). Единственный пакет в зоне; зона существует как slot для обучающего домена.
- **Status:** `skeleton` (0.0.0) — структура, конвенции, регистрация, multi-entry build, smoke-тесты «по-взрослому» как в studio, но **тела компонентов — плейсхолдеры** (`data-stub`, никакой реальной логики/бэкенда).
- **Priority:** **P2** — фундамент под обучающий app; наполнение и backend-интеграция — последующие итерации.
- **Maturity bar (→ alpha):**
  - Реальный UI модулей (lesson/exercise/progress/library/guides/sentence-builder) вместо плейсхолдеров.
  - `Controllers.Learn` реализован (валидация exercise, progress-апдейты) через useEmit (ADR 032).
  - Backend-интеграция: `web-query` endpoints к `/learn/*` (ADR 055 D2).
  - app `apps/learn/` связан с пакетом, верификация в браузере.
- **Active blockers:** owner-agent `owner-web-learn` ещё не создан (появится отдельным PR). Пока зона ведётся через scoped `learn`-сессию.
- **Last activity:** 2026-06-28 (skeleton scaffold, iter 1).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@capsuletech/web-core`** (workspace, dep) — HCA: `useEmit` (Welcome → `onNavigate`, LibraryNav → `onLibraryNavigate`), `defineCapsuleModule` (регистрация).
- **`@capsuletech/web-router`** (workspace, dep) — `useRouter().current()` для derived-active в `LibraryNav` (URL = single source of truth, как studio Navigation).
- **`@capsuletech/web-ui`** (workspace, dep) — chrome модулей (Typography / Card / Layout / Button / Group / Input / Toggle).

> `@capsuletech/web-query` добавится при backend-интеграции — сейчас НЕ зависимость.

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
| `./library` | `WordExplorer` / `Collections` / `Navigation` (под-навигация, useEmit `onLibraryNavigate`) / `VocabList` / `BookmarkButton`. Internal `LIBRARY_SEGMENTS` + `LIBRARY_BASE` (не реэкспортятся) |
| `./guides` | `Tour` / `Step` / `Spotlight` / `Hint` |
| `./sentence-builder` | `SentenceBuilder` |
| `./welcome` | `Welcome` (tier-2 connected, useEmit `onNavigate`) + `LEARN_SEGMENTS` |
| `./controllers` | гнездо `Controllers.Learn` (ADR 032) — пока пусто (`export {}`) |
| `./capsule` | `defineCapsuleModule({ name: 'Learn', components })` (ADR 033) |

Это **контракт**. Изменение публичного API = breaking change → coordinate с architect.

## Quirks / gotchas

- **`TypeError.tsx` экспортит `TypeErrorBadge`** — имя компонента намеренно не `TypeError`, чтобы не шадоуить global `TypeError`.
- **`Welcome` bare не юнит-тестируется** — его `useEmit` требует Controller-контекст (как и studio Welcome). Smoke покрывает только pure-display плейсхолдеры.
- **Smoke рендерит через `solid-js/web`** (manual host + dispose), НЕ через `@solidjs/testing-library` — её в репо нет; эталон (studio) тестирует так же.
- **Multi-entry vite build** — все 11 subpaths обязаны присутствовать в `dist/`.
- **`controllers` гнездо пустое** — `Controllers.Learn` появится при наполнении.

## План рефакторинга / оптимизаций

```markdown
- [x] Skeleton scaffold (структура + регистрация + smoke) — 2026-06-28.
- [ ] Наполнить модули реальным UI (lesson/exercise/progress/library/guides/sentence-builder).
- [ ] Реализовать `Controllers.Learn` (useEmit-эмиссия доменных событий обучения).
- [ ] Backend-интеграция: `web-query` endpoints к `/learn/*` (ADR 055 D2).
- [ ] Создать owner-agent `owner-web-learn` (отдельный PR).
```

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit (smoke) | `src/__tests__/smoke.test.tsx` | рендер pure-display плейсхолдеров (LessonView/Exercise dispatch/Progress/VocabList/Tour/SentenceBuilder) |

**Перед изменением:** smoke должны быть green (`pnpm --filter @capsuletech/web-learn test`).

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
