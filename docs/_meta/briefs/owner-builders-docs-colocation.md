---
title: brief — owner-builders — docs-as-data per-package distribution
audience: owner-builders
status: proposed
created: 2026-06-16
last_updated: 2026-06-16
tags: [brief, owner-builders, docs, adr-048]
---

# Brief — docs-as-data: per-package distribution (движок как библиотека, дока живёт в пакете)

## Цель {#goal}

Переделать docs-as-data pipeline (ADR 048) так, чтобы:

1. **Документация юнита живёт рядом с юнитом** (`packages/**/*.md`, `apps/**/*.md`) — colocation per ADR 047 D5.
2. **Каждый пакет сам производит** свой кусок registry при сборке — никакого центрального сканера монорепо.
3. **Движок — переиспользуемая библиотека**, которой пользуется и capsule-монорепо, и внешний пользователь framework'а в своём приложении.
4. **App / Studio композирует** registry из импортов пакетов — точно как уже композирует UI-примитивы и controllers (ADR 033 pattern).

Триггер: при попытке расширить центральный `extract.mjs` на `packages/**` стало видно, что monorepo-internal сканер не масштабируется на внешнего пользователя capsule (он не может его «настроить на свой монорепо»). Правильная модель — пакет владеет своей докой так же, как владеет своими компонентами.

## READ FIRST {#read-first}

- `docs/_meta/docs-system.md` — canon section-ID / frontmatter / audience / wikilinks / slug-derivation. **Это остаётся**, меняется только канал поставки.
- `docs/01-architecture/adr/048-docs-as-data.md` — обоснование. D1–D3 (single source / section-ID / audience) и D6 (CI drift-guards) — без изменений. D4 (extraction) и D5 (consumer) — пересматриваются этим брифом.
- `docs/01-architecture/adr/033-package-registration.md` — pattern для package-level registration. Эту же модель применяем к докам.
- `docs/01-architecture/adr/047-frontend-architecture-zones-cycle-vendor.md` — D5 colocation rule.
- `docs/_build/extract.mjs` — текущая центральная реализация. Станет reference для нового пакетного движка, потом удаляется.
- `packages/web/studio/src/docs/` — текущий consumer. Контракт `IDocsRegistry` сохраняется, меняется только как registry заполняется.

## Контекст: что не так с центральным сканером {#context}

Текущий `extract.mjs` хардкодит `DOCS_DIR = 'docs/'` и ходит только по нему. Добавить `packages/**` и `apps/**` как scan roots **технически** просто (предыдущая версия этого брифа так и предлагала), но это решение работает только пока вся кодовая база — внутри одного монорепо capsule.

**Реальная цель** — framework: внешний пользователь пишет свой пакет на capsule, кладёт `.md` рядом со своим компонентом, и оно автоматически работает в его Studio. Центральный сканер этого не даёт — внешний пользователь не может «добавить путь» в скрипт, который сидит внутри capsule-репо.

Параллель с UI: никто не пишет «центральный реестр всех Button'ов в монорепо». Каждый пакет экспортит свои примитивы → app импортит → composition. Doc'и должны вести себя так же.

## Архитектура (предлагаемая, на согласование) {#architecture}

### Три роли {#roles}

| Роль | Кто | Что делает |
|---|---|---|
| **Движок** | `@capsuletech/docs-builder` (новый пакет в `packages/builders/`) | Build-time helper. Принимает source dir + frontmatter rules + slug strategy → возвращает / эмитит `docs.json` chunk. |
| **Producer** | каждый пакет (`@capsuletech/web-ui` и т.д.) | В своём `build` дёргает движок → получает свой `docs.json` рядом с `dist/` → экспортит через subpath `./docs.json`. |
| **Composer** | `@capsuletech/web-studio/docs` (consumer уже есть) | Импортит `docs.json` из пакетов которые app использует, мерджит в единый runtime registry. Предоставляет `<DocSection>`, `useDoc()` и т.д. |

App в этом флоу **не импортит движок** и не настраивает scan roots. App импортит web-studio + пакеты с которыми работает — composition автоматическая через ADR 033 pattern.

### Где лежит `.md` {#md-location}

```
packages/web/kit/ui/
├── README.md                                       ← package-level doc (root)
├── src/
│   ├── primitives/
│   │   ├── button/
│   │   │   ├── button.tsx
│   │   │   ├── button.stories.tsx
│   │   │   └── README.md                          ← unit-level doc (colocated)
│   │   └── input/
│   │       └── README.md
└── package.json
```

Структура внутри пакета — выбор owner-<pkg>. Движок не enforce'ит layout, только сканит `**/*.md` относительно package root (с exclusion-list).

### Producer контракт {#producer-contract}

В `package.json` пакета:

```json
{
  "name": "@capsuletech/web-ui",
  "exports": {
    "./docs.json": "./dist/docs.json"
  },
  "scripts": {
    "build:docs": "capsule-docs build"
  }
}
```

В `vite-builder` / build pipeline пакета — шаг `build:docs` встроен в основной `build` (или плагин дёргает movement автоматически — детали owner-builders).

### Composer контракт {#composer-contract}

`@capsuletech/web-studio/docs` использует ADR 033 registration pattern:

```ts
// web-studio capsule.ts (или DocsProvider init)
import webUiDocs from '@capsuletech/web-ui/docs.json';
import webLayoutDocs from '@capsuletech/web-layout/docs.json';
import coreDocs from '@capsuletech/docs/registry.json'; // корневая docs/ → отдельный пакет

Docs.register(webUiDocs);
Docs.register(webLayoutDocs);
Docs.register(coreDocs);
```

Или automatic-discovery через capsule.ts manifests — owner-builders + owner-studio согласовывают конкретный механизм. Главное — **app не пишет scan paths**, только импорты пакетов.

### Корневой `docs/` {#root-docs}

`docs/` (ADR, architecture, _meta) становится отдельным пакетом `@capsuletech/docs` (или `@capsuletech/docs-core`). Та же модель что и любой другой пакет — собственный build → собственный `docs.json` → web-studio импортит.

Это убирает специальный случай «корневая папка docs обрабатывается иначе чем package docs».

## Slug namespace {#slug}

`<pkg-short>/<unit>` где `pkg-short` = npm-name без `@capsuletech/` префикса:

| Файл | Slug |
|---|---|
| `packages/web/kit/ui/README.md` | `web-ui` |
| `packages/web/kit/ui/src/primitives/button/README.md` | `web-ui/button` |
| `packages/web/boost/layout/src/matrix/README.md` | `web-layout/matrix` |
| `apps/playground/README.md` | `app/playground` |
| `docs/01-architecture/adr/048-docs-as-data.md` (root pkg) | `architecture/adr/048-docs-as-data` (как сейчас) |

Почему npm-name без префикса:
- стабильно при перемещении пакета между zones (прецедент: ADR 046 amend);
- не зависит от внутренней структуры пакета (`src/primitives/...`);
- не коллидится с slug'ами корневого docs-пакета.

## Frontmatter расширения {#frontmatter}

Canon `docs-system.md` §2 остаётся as-is. Опционально для package/unit docs:

- `package: @capsuletech/web-ui` — npm-name (помогает composer'у валидировать что doc реально пришёл из этого пакета);
- `unit: button` — короткое имя юнита.

Оба — опциональные, движок может derive'ить из package.json + path если не указаны.

## Wikilinks cross-package {#wikilinks}

- **Per-package build**: резолвит только локальные wikilinks. Внешние — оставляет как есть.
- **App-side (composer)**: после мерджа registries резолвит cross-package wikilinks. Упавшие — warning в dev, error в production build (через build-time check, не runtime).
- **Capsule monorepo CI**: отдельная job `docs:check-all` строит registries всех пакетов + резолвит весь link-graph. Гарантия что внутри capsule всё связано.

Внешний пользователь capsule НЕ обязан резолвить cross-package linkrot — это его дело как настроить.

## Exclusion list {#exclusions}

Дефолтные skip patterns в движке (можно override per-package):

- `OWNERSHIP.md`
- `CHANGELOG.md`
- `node_modules/**`, `dist/**`, `.capsule/**`, `__tests__/**`, `.generated/**`

`.md` без frontmatter:
- skip silently если matches default exclusion list;
- warn (видно в build log) иначе;
- никогда не error (legacy не валит build).

## Что НЕ делаем (out of scope) {#non-goals}

- **JSDoc → registry.** Отдельная задача, нужен AST-парсер. После того как per-package model стабилизируется.
- **MDX, live demos.** Отложено (ADR 048).
- **Search index.** Отложено.
- **Replatform на Astro/Velite.** Не запрещено, но не требуется — движок может остаться line-based parser'ом, просто оформленным как пакет.
- **Динамическая регистрация на runtime** (lazy-loaded docs). Сейчас static-import на bootstrap. Дальше — отдельный feature если понадобится.
- **Миграция существующих docs.** Брифом не покрывается — отдельный PR после готовности движка.

## Open questions (решает главный, не owner-builders в одиночку) {#open-questions}

1. **Где лежит движок.** Кандидаты:
   - (a) Standalone `packages/builders/docs-builder/` — переиспользуется любым пакетом.
   - (b) Subpath `@capsuletech/vite-builder/docs` — если плотно интегрирован с Vite-плагинами.
   - (c) Отдельный CLI bin `capsule docs build` через `@capsuletech/cli`.

   Предварительно (a) — самый чистый, owner-builders владеет, не цепляется за Vite-specific API.

2. **Когда дёргается producer.** Кандидаты:
   - (a) Шаг `build:docs` в `package.json` scripts, явно дёргается основным `build`.
   - (b) Vite-plugin в `lib-builder` / `vite-builder` автоматически.

   Предварительно (b) — меньше boilerplate per-package, owner-builders встраивает в стандартный build.

3. **Composer registration механизм.** Кандидаты:
   - (a) Manual `Docs.register(...)` в app capsule.ts.
   - (b) Auto-discovery через capsule.ts manifests (как ADR 033 для UI-компонентов).

   Предварительно (b) — симметрично с UI/controllers, app не пишет boilerplate.

4. **Структура `@capsuletech/docs` пакета** (бывший `docs/` root). Один большой пакет или разбить на `@capsuletech/docs-architecture`, `@capsuletech/docs-meta`? Предварительно — один пакет, разбиение если станет неудобно.

5. **Cross-package wikilink check на CI**. Где live'нет: в отдельной job или в `pnpm docs:build` корневого `@capsuletech/docs` (который импортит все остальные)?

Эти ответы должны быть в новом ADR (см. §Деливери), не разбросаны по коду.

## Verification {#verification}

После имплементации:

1. `pnpm --filter @capsuletech/web-ui build` создаёт `packages/web/kit/ui/dist/docs.json` с корректными slug'ами.
2. `import docs from '@capsuletech/web-ui/docs.json'` работает (subpath export'ы корректны).
3. В playground `<DocSection slug="web-ui/button#…"/>` рендерит colocated `.md` секцию из `packages/web/kit/ui/src/primitives/button/README.md`.
4. Тест: удалить `packages/web/kit/ui` import из playground → registry перестаёт содержать `web-ui/*` slugs (доказательство что composition реально per-import).
5. Существующие `docs/`-slug'и (после миграции root в `@capsuletech/docs`) не изменились — snapshot baseline.
6. `web-studio/docs` unit-тесты — без правок (контракт `IDocsRegistry` сохранён).

## Деливери {#delivery}

1. **Phase 0 — новый ADR.** Главный заводит [[../../01-architecture/adr/052-docs-builder-per-package|ADR 052]] «Docs-as-data — per-package distribution». Решает open questions §1–5. Замещает ADR 048 D4 + D5 (но НЕ D1–D3, D6, D7 — они остаются canon). **Status: done.**
2. **Phase 1 — design PR (no code), owner-builders.** Update `docs/_meta/docs-system.md` секциями про distribution channel + producer contract + composer contract. Согласовать с главным → merge. **Status: done.**
3. **Phase 2 — impl PR (engine), owner-builders.** Создать `@capsuletech/docs-builder` пакет (порт логики из `extract.mjs`). Unit-тесты. Без consumers — пакет работает изолированно.
4. **Phase 3 — impl PR (root docs as package), owner-builders + главный.** Создать `@capsuletech/docs` (corner case: package wrapping корневую `docs/`). Удалить `docs/_build/extract.mjs`. Перевести `pnpm docs:build` на новый flow. **Status: done (2026-06-16, branch feat/docs-builder-phase-3).**
5. **Phase 4 — impl PR (first colocated), owner-web-ui.** Подключить `docs-builder` к `@capsuletech/web-ui` build. Добавить один colocated README (Button) как canonical example. Проверить через playground.
6. **Phase 5 — followup, owner-studio.** Обновить `web-studio/docs` composer на ADR 033 registration (если §3 = (b)). Composer перестаёт зависеть от monorepo layout.
7. **Phase 6 — rollout, остальные owner-<pkg>.** Каждый owner подключает `docs-builder` к своему пакету по своему графику.

## Связанное {#related}

- [[048-docs-as-data|ADR 048]] D1–D3, D6 — canon (сохраняется). D4–D5 — пересматриваются.
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D5 — colocation.
- [[033-package-registration|ADR 033]] — registration pattern (применяется к докам).
- [[docs-system]] — canon section-ID / frontmatter / audience (расширяется секцией про distribution).
- `docs/_build/extract.mjs` — текущая центральная реализация. Reference для портирования, потом удаляется.
- `packages/web/studio/src/docs/` — consumer. Контракт `IDocsRegistry` сохраняется.
