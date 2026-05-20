---
title: Architect Routing — symptom → agent
status: living
last-updated: 2026-05-20
---

# Architect Routing

**Для главного assistant'а.** Куда делегировать в зависимости от запроса. Это symptom→action lookup, не exhaustive guide.

> **Принцип:** routing first, action second. Не делай **сам** то что делает owner-*. Это нарушает boundaries и удваивает работу.

## По типу запроса

### 🔧 Code / packages

| Запрос / симптом | Куда |
|---|---|
| "Сделай feature X в `@capsuletech/<pkg>`" | `owner-<pkg>` |
| "Добавь primitive Y в web-ui" | `owner-web-ui` |
| "Перепиши Layout API" (cross-package contract) | **Ты** (архитектура) → координируешь `owner-web-ui` + `owner-web-core` |
| "Bug в UI после рендера" | `owner-tests` (диагноз класса) → ты → `owner-<class>` |
| "Не работает route /workspace" | `owner-tests` (curl + console) → ты → `owner-builders` (RouterPlugin) или `owner-web-core` |
| "Стили не применяются" | `owner-tests` (CSS dump) → ты → `owner-builders` (scaffold styles.css) или `owner-web-style` |
| "Storybook не запускается" | `owner-web-ui` (его инфраструктура) |
| "Сломался Controller dispatch" | `owner-web-core` (engine/controller-proxy) |

### 🧪 Testing / infrastructure

| Запрос | Куда |
|---|---|
| "Развернуть workspace в `D:\foo\bar`" | `owner-tests` |
| "Прогон smoke" | `owner-tests` |
| "Запусти dev в e2e/fixture" | `owner-tests` |
| "Опубликуй в Verdaccio" | `owner-tests` (с `release-local --group=all`) |
| "Verdaccio storage пустой?" | `owner-tests` |
| "Phase 2 fixture (page/widget/entity)" | `owner-tests` правит `smoke.mjs` |
| "Storybook live URL" | `owner-tests` (orchestrates `pnpm storybook:ui`) |

### 🌳 Git workflow

| Запрос | Куда |
|---|---|
| "Закоммить и запушь" | `owner-git` |
| "PR с этими изменениями" | `owner-git` (full cycle) |
| "Merge PR #X" | `owner-git` (после CI green) |
| "Зачисти merged ветки" | `owner-git` |
| "Найди где сломалось" (bisect) | `owner-git` (`git bisect`) |
| "Сообщи статус CI PR'а" | `owner-git` (`gh pr checks`) |
| **Force-push в main / history rewrite** | **Ты** (никогда не auto-delegate) |

### 📦 Dependencies

| Запрос | Куда |
|---|---|
| "Аудит deps перед release" | `owner-deps` |
| "Глянь pnpm-lock.yaml diff" | `owner-deps` |
| "Почему два xstate?" | `owner-deps` (`pnpm why`) |
| "Обнови dep-management-plan.md" | `owner-deps` |
| "Bump solid-js 1.9.12 → 1.9.13" | `owner-deps` диагноз → **ты** делаешь bump (shared infra) |
| "Замени zod 3 → 4" (major) | **Ты** (breaking decision) → `owner-deps` помогает с impact analysis |

### 📐 Architecture / cross-package

| Запрос | Куда |
|---|---|
| "Спроектируй новый wrapper-слой" | **Ты** + relevant owners |
| "ADR про X" | **Ты** + `docs-writer` если doc-heavy |
| "Контракт между Y и Z" | **Ты** (определяешь) → координируешь owners |
| "Refactor breaking change на 5 пакетов" | **Ты** (план) → owners выполняют по своим зонам |
| "Куда положить новый package" | **Ты** (group decision) |

### 📝 Documentation

| Запрос | Куда |
|---|---|
| Feature doc (AI anchor + user guide) | `docs-writer` |
| OWNERSHIP.md update | `owner-<pkg>` сам |
| ADR | **Ты** (draft) + `docs-writer` (форматирование) |
| README пакета | `owner-<pkg>` |
| Cross-link audit | `owner-deps` (или ты вручную) |

## По симптому failure

| Симптом | Скорее всего класс | Кому диагностировать |
|---|---|---|
| `Cannot find module @capsuletech/X` при install | Verdaccio empty / publish chain broken | `owner-tests` |
| 503 на route в browser | Scaffold / RouterPlugin | `owner-tests` → `owner-builders` |
| `Ui.X is undefined` | UI namespace registry / missing lazy import | `owner-web-core` (imports.tsx) |
| `border-l` нет в bundled CSS | Tailwind scan / `@source` | `owner-builders` (scaffold styles.css) |
| `box-sizing: border-box` ×100 в DOM | Multiple Tailwind `@import` | `owner-web-style` (themes) |
| Layout handle на пол экрана | Matrix / Flex layout logic | `owner-web-ui` |
| Controller не реагирует на click | UiProxy event-binding | `owner-web-core` (engine) |
| `pnpm install` падает silently в CI mode | CLI exit code | `owner-cli` |
| EPERM при rm fixture/ | Windows process tree kill | `owner-tests` (smoke.mjs) |
| Verdaccio storage пуст после publish | release-local pipeline | **Ты** или `owner-tests` |
| CI red на PR | Зависит от check | `owner-git` triage → ты → relevant owner |

## Когда делать самому (architect)

Сам пишешь / правишь **только**:
- `CLAUDE.md`, `docs/_meta/*.md`, ownership matrix (cross-cutting).
- `scripts/release-local.mjs` и подобный shared infra.
- Root-level configs (`package.json`, `tsconfig.base.json`, `nx.json`).
- Memory (`~/.claude/projects/.../memory/*.md`).
- ADR'ы в `docs/01-architecture/adr/`.

**Не** правишь:
- `packages/<pkg>/src/` — owner-<pkg>.
- `packages/<pkg>/OWNERSHIP.md` — owner-<pkg> сам.
- `packages/cli/e2e/smoke.mjs` — owner-tests.
- `.github/workflows/*.yml` — owner-ci (когда появится).

## Pattern: triage incoming request

```
User: "<запрос>"
  ↓
Триаж:
  1. Архитектурное cross-package? → ты + owners
  2. Локальный fix в одном пакете? → owner-<pkg>
  3. Infrastructure (test/git/deps)? → owner-tests / owner-git / owner-deps
  4. "Не знаю работает ли" → owner-tests или ты сам проверь
  ↓
Делегирование:
  - Конкретное Task description.
  - Owner возвращает summary.
  - Coordinate result.
```

## Когда `Agent(subagent_type=...)`

В тулзе `Agent` — это **новый** instance с пустым context. Брифинг должен быть **self-contained**:
- Зачем эта задача (контекст).
- Конкретные файлы / директории.
- Что **точно** не делать.
- Когда возвращать summary.

Не делегируй "based on findings, fix the bug". Это твоя архитектура — синтез делаешь ты, owner-* выполняет конкретику.

## Связанные документы

- `CLAUDE.md` — POLICY (корневой).
- `docs/_meta/agents.md` — ownership matrix (полная).
- `docs/_meta/anti-patterns.md` — каталог костылей.
- `docs/_meta/dep-management-plan.md` — план dep гигиены.
