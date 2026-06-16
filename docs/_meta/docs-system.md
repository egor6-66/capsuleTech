---
title: docs-system-canon
description: Canon для docs-as-data pipeline (ADR 048) — section-ID convention, frontmatter contract, extractable-block shape, slug derivation. Single source of truth для движка `@capsuletech/docs-builder` + per-package producers + `@capsuletech/web-docs` composer.
status: canon
type: canon
last_updated: 2026-06-16
date: 2026-06-12
audience: [agent, dev]
tags: [meta, docs-as-data, canon]
---

# Docs system canon

> Канон-источники: [[048-docs-as-data|ADR 048]] D1–D3, D6, D7. D4–D5 заменены [[../01-architecture/adr/052-docs-builder-per-package|ADR 052]] (per-package distribution) — см. также [[briefs/owner-builders-docs-colocation|brief]].
>
> Этот файл — single source of truth для движка (`@capsuletech/docs-builder`, в работе; reference — `docs/_build/extract.mjs`), per-package producers, composer'а `@capsuletech/web-docs` и CI drift-guards. Изменение конвенции — правка ЭТОГО файла + движка + регенерация registry.

## Зачем {#why}

Markdown в `docs/**/*.md` остаётся source-of-truth для documentation; build-time extractor → typed registry → JSX/programmatic consumers. См. ADR 048 контекст.

## 1. Section-ID convention {#section-id}

### 1.1 Syntax {#section-id-syntax}

```markdown
## Decision 1 — Boost namespace {#D1}
## Roll-out {#rollout}
### D4 — Build-time extraction {#D4}
```

`{#id}` — постфикс heading'а. Поддерживается Obsidian + remark-attr + большинством MD-обработчиков. Slug стабилен независимо от текста heading'а.

### 1.2 Case convention {#section-id-case}

| Тип секции | Case | Примеры |
|---|---|---|
| ADR Decision | UPPERCASE `D<N>` | `{#D1}`, `{#D2}`, `{#D6}` |
| Meta-секции (стандартизованные) | kebab-case | `{#context}`, `{#consequences}`, `{#rollout}`, `{#alternatives}`, `{#open-questions}` |
| Прочие секции | kebab-case | `{#vendor-stack}`, `{#new-package-checklist}` |

### 1.3 Stable-slug fallback {#section-id-fallback}

Если у H2/H3 нет `{#id}`:
- Auto-slug из heading text: lowercase, пробелы → `-`, выкидываются emoji/пунктуация, collision suffix `-2/-3/...`.
- Extractor эмитит **warning** в CI (не error). Сигнал «добавь явный `{#id}` при следующем касании».
- После inventory pass (Phase E2) — escalate до **error**.

### 1.4 Reserved ID convention для ADR {#section-id-reserved}

Не enforced, но рекомендуется (extractor + DocSection полагаются для cross-ADR queries):

- `{#context}` — Контекст / Pain
- `{#decisions}` — Decisions (контейнер H2)
- `{#D1}`, `{#D2}`… — конкретные decision'ы (H3)
- `{#consequences}` — Последствия
- `{#rollout}` — Roll-out
- `{#alternatives}` — Альтернативы (rejected)
- `{#open-questions}` — Open questions

### 1.5 Heading levels = sections {#section-id-levels}

| Level | В registry | Роль |
|---|---|---|
| `# H1` | НЕТ (doc title) | Заголовок документа |
| `## H2` | ДА (section) | Top-level секция |
| `### H3` | ДА (section, `parentId` ссылается на H2) | Sub-section, decisions |
| `#### H4` | НЕТ (inline content) | Nested content секции |
| `##### H5+` | НЕТ | Inline content |

H4+ — content внутри текущей H3-секции (или H2 если H3 нет), не отдельная registry-entry.

## 2. Frontmatter contract {#frontmatter}

### 2.1 Required {#frontmatter-required}

```yaml
---
title: <string>              # H1 если не указан явно — fallback от H1
status: <status>             # См. status enum ниже
tags: [<string>]             # Категоризация для индекса
last_updated: YYYY-MM-DD     # Дата последней правки (CI валидирует против git log)
---
```

**`status` enum:**
- `proposed` — ADR в обсуждении
- `canon` — установленный канон (zone docs, conventions)
- `documented` — стабильная справка
- `deprecated` — устарел, но не удалён
- `superseded` — заменён другим документом (см. `supersedes`)

### 2.2 Optional {#frontmatter-optional}

```yaml
type: <adr|guide|ai-anchor|canon|brief>     # Default: derived from path
description: <string>                        # One-liner для индекса
audience: [<agent|dev|user|report>]          # Doc-level default; секции override
date: YYYY-MM-DD                             # Дата создания (ADR-specific, иммутабельная)
amended: YYYY-MM-DD                          # Дата последнего amendment (ADR-only)
supersedes: <slug>                           # ADR заменяет другой ADR
supersedes_partial: <slug>                   # ADR частично заменяет
```

**`type` derivation от path:**
- `docs/01-architecture/adr/*` → `adr`
- `docs/_meta/*` → `ai-anchor` (если `audience: [agent]` или `audience: claude`) либо `canon`
- `docs/09-packages/*` → `guide`
- Прочие → `guide` (общий fallback)

`type` в frontmatter всегда побеждает derivation.

### 2.3 `date` vs `last_updated` {#frontmatter-dates}

| Поле | Когда | Кто обновляет |
|---|---|---|
| `date` | Создание doc'а (ADR-specific, **не меняется**) | Автор PR'а где doc создан |
| `last_updated` | Последняя правка (все docs) | Автор PR'а где правится |

CI (E6) валидирует `last_updated` против `git log` последнего касания файла.

### 2.4 Default audience inheritance {#frontmatter-audience}

- Frontmatter `audience: [<list>]` → ВСЕ секции по умолчанию имеют этот audience.
- Section-level `<!-- audience: X -->` блок **переопределяет** для своего содержимого.
- Если в frontmatter нет `audience` — default `[agent, dev, user]` (доступно всем кроме `report`).

## 3. Audience-comment блоки {#audience}

### 3.1 Block syntax {#audience-block}

```markdown
<!-- audience: agent,dev -->
content available to agents and devs
<!-- /audience -->
```

### 3.2 Inline syntax (для коротких блоков) {#audience-inline}

```markdown
<!-- audience: agent --> ad-hoc note for agent only <!-- /audience -->
```

Обе формы поддерживаются extractor'ом. Без перевода строк между open и close — inline; с переводом — block.

### 3.3 Audience values {#audience-values}

- `agent` — LLM-агенты capsule (owner-*, главный, sub-agents)
- `dev` — разработчики (внутренние + внешние OSS-консьюмеры)
- `user` — конечные пользователи capsule-приложений (упрощённый язык)
- `report` — бизнес-выгрузки (sales, legal, accounting)

Одна секция → один или несколько audience (comma-separated). Unknown audience = CI error.

## 4. Wikilink resolution {#wikilinks}

### 4.1 Syntax {#wikilinks-syntax}

- `[[target-slug]]` — линк на target
- `[[target-slug|display alias]]` — линк с alias
- `[[target-slug#section-id]]` — линк на конкретную секцию

### 4.2 Resolution {#wikilinks-resolution}

- Target резолвится против registry keys (см. §5.1)
- Section-id (если задан) резолвится против `sections` doc'а target'а
- Упавший wikilink = CI **warning** в v1 (после E2 inventory — escalate до **error**)

### 4.3 Collected в registry {#wikilinks-collected}

- Каждая секция несёт `wikilinks: string[]` — все исходящие references из body этой секции
- Doc-level `wikilinks` = union секций (для link-graph аналитики)

## 5. Slug derivation {#slug}

### 5.1 Path → registry key (DocSlug) {#slug-doc}

Правило:
1. Берём path относительно `docs/` без `.md` extension
2. Strip numeric prefix `^\d+-` из **директорий** (не из file basename)
3. Результат — slug

Примеры:
| Path | DocSlug |
|---|---|
| `docs/01-architecture/adr/048-docs-as-data.md` | `architecture/adr/048-docs-as-data` |
| `docs/_meta/studio.md` | `_meta/studio` |
| `docs/_meta/web-zones/studio.md` | `_meta/web-zones/studio` |
| `docs/09-backend/desktop.md` | `backend/desktop` |
| `docs/00-index.md` | `index` |

### 5.2 Section reference (SectionSlug) {#slug-section}

Формат: `${DocSlug}#${SectionID}`.

Пример: `architecture/adr/048-docs-as-data#D4` — секция D4 в ADR 048.

## 6. Extractable-block shape (registry) {#shape}

```ts
// docs/.generated/registry.ts
export const docs = {
  'architecture/adr/048-docs-as-data': {
    meta: {
      title: 'ADR 048 — Docs as data...',
      status: 'proposed',
      type: 'adr',
      tags: ['hca', 'adr', 'proposed', 'docs', 'infrastructure'],
      date: '2026-06-11',
      last_updated: '2026-06-11',
      audience: ['agent', 'dev', 'user'],     // resolved default (frontmatter || system-default)
      // ... rest of frontmatter passed through
    },
    sections: {
      D4: {
        heading: 'D4 — Build-time extraction → typed registry',
        level: 3,
        parentId: 'decisions',                 // если H3 внутри H2 с id
        body: '<raw markdown source>',         // section content БЕЗ heading line, audience-comments СОХРАНЕНЫ
        audience: ['agent', 'dev'],            // resolved (section blocks || frontmatter || default)
        wikilinks: ['047-frontend-architecture-zones-cycle-vendor'],
      },
      // ...
    },
    wikilinks: [...],                          // doc-level union секций
  },
} as const;

export type DocSlug = keyof typeof docs;
export type SectionSlug = `${DocSlug}#${string}`;
```

**v1 НЕ эмитит:**
- `bodyHtml` — добавится в E5 когда `<DocSection>` будет написан (понятно нужен HTML или Solid AST)
- `bodyAst` — то же

`body` — raw markdown, audience-блоки сохранены (consumer может селективно их применять).

## 7. Pipeline & tooling {#pipeline}

### 7.1 Output {#pipeline-output}

- `docs/.generated/registry.ts` — typed registry для apps/studio consumers
- `docs/.generated/registry.json` — то же в JSON, для CI tooling / debug
- `docs/.generated/` — в `.gitignore` (regenerated artifact)

### 7.2 Script {#pipeline-script}

```bash
pnpm docs:build         # → pnpm --filter @capsuletech/docs build
```

> ADR 052 Phase 3 (2026-06-16): script переведён на `@capsuletech/docs` пакет.
> `docs/_build/extract.mjs` удалён. Результат: `packages/docs/dist/docs.json`.

### 7.3 Parser stack {#pipeline-parser}

Custom line-based parser (zero new deps). Обрабатывает:
- YAML frontmatter (между `---`/`---` в начале файла)
- Headings с `{#id}` постфиксом
- Audience HTML-комменты (block + inline)
- Wikilinks `[[slug]]`, `[[slug|alias]]`, `[[slug#section]]`
- Code-fence aware (не парсит `##` внутри ``` ```)

### 7.4 CI integration (E6, отложено) {#pipeline-ci}

После E1 stable:
- `pnpm docs:build` в CI job
- Job fails: wikilink errors (post-E2), section-ID collisions, unknown audience, frontmatter schema mismatch
- Job warns: auto-slug (нет `{#id}`), missing recommended fields

## 8. Distribution channel (per-package) {#distribution}

> Канон-источник: [[../01-architecture/adr/052-docs-builder-per-package|ADR 052]]. Pending имплементации — см. [[briefs/owner-builders-docs-colocation|brief]]. Текущая центральная реализация (`docs/_build/extract.mjs`) — reference, удаляется после готовности нового движка (Phase 3).

### 8.1 Три роли {#distribution-roles}

| Роль | Кто | Что делает |
|---|---|---|
| Engine | `@capsuletech/docs-builder` (новый, в `packages/builders/`) | Build-time helper-библиотека. Sources → docs.json chunk. Реализует §1–§7 канона. |
| Producer | каждый пакет (`@capsuletech/web-ui` и т.д.) | В своём build дёргает engine → эмитит `dist/docs.json` → экспортит через subpath `./docs.json` + регистрирует в `capsule.ts`. |
| Composer | `@capsuletech/web-docs` | Через ADR 033 auto-discovery собирает `docs.json` пакетов которые app зарегистрировал, мерджит в runtime registry, отдаёт через `<DocSection>` / `useDoc()`. |

App **не импортит engine** и не настраивает scan paths. Composition — через ADR 033 registration pattern, симметрично с UI-компонентами и controllers.

### 8.2 Engine API — `@capsuletech/docs-builder` {#distribution-engine}

**Расположение:** `packages/builders/docs-builder/`. **Релиз-группа:** `cli` (fixed-versioning, тег `cli@{version}`). **Owner:** `owner-builders`.

**Programmatic API** (основной путь использования):

```ts
import { extractDocs } from '@capsuletech/docs-builder';

const registry: IDocsRegistry = await extractDocs({
  root: '/abs/path/to/packageRoot',     // абсолютный путь до package root
  slugStrategy: 'package',              // 'package' | 'app' | 'docs'
  pkgName: '@capsuletech/web-ui',       // для slug-derivation pkg-short
  exclude?: string[],                   // дополнительно к defaults (§8.9)
});
```

`extractDocs` — pure function, side-effect-free. Возвращает в памяти. Caller сам решает куда писать (`dist/docs.json` через Vite-plugin, stdout через CLI, тест-fixture через прямой вызов).

**CLI bin (escape-hatch):**

```bash
capsule-docs build --root . --pkg-name @capsuletech/web-ui --strategy package --out dist/docs.json
```

Для пакетов вне Vite/lib-builder pipeline'а.

**Зависимости:** zero new deps. Порт логики из `docs/_build/extract.mjs` (line-based parser).

### 8.3 Producer — Vite-plugin + subpath exports {#distribution-producer}

**Plugin расположение:** `DocsExtractPlugin` живёт в `@capsuletech/docs-builder` рядом с engine'ом (Phase 3.5 refactor — `docs-builder` владеет всей docs-логикой). `lib-builder` остаётся zero-deps leaf; `vite-builder` про docs тоже не знает. Каждый consumer (package или app) **явно** подключает плагин в свой `vite.config.mts` — opt-in per package (см. ниже).

**Plugin lifecycle:**

1. На `closeBundle` сканирует `<packageRoot>/**/*.md` per exclusion-list (§8.9). `rootOverride` позволяет указать другой sandbox-корень.
2. Дёргает `extractDocs({ root, slugStrategy, pkgName })` — `pkgName` берётся из `package.json`, `slugStrategy` — из `slugStrategyOverride` (default `'package'`; `'app'` для `apps/<name>`; `'docs'` для root `@capsuletech/docs`).
3. Пишет `dist/docs.json` через Node `fs.writeFileSync` (надёжно в SSR/node build mode).

**Producer-канон (явное подключение):**

```ts
// packages/<scope>/<name>/vite.config.mts
import { DocsExtractPlugin } from '@capsuletech/docs-builder';
import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: 'src/index.ts',
  name: 'MyPackage',
  plugins: [
    DocsExtractPlugin({
      // enabled?: boolean              — default true
      // exclude?: string[]             — ДОПОЛНИТЕЛЬНО к §8.9 defaults
      // slugStrategyOverride?: ...     — default 'package'
      // rootOverride?: string          — default cwd (package root)
    }),
  ],
});
```

Для root `@capsuletech/docs`: `DocsExtractPlugin({ slugStrategyOverride: 'docs', rootOverride: REPO_DOCS_PATH })` — единственный consumer, который сканирует чужой корень.

**`package.json` exports (owner-<pkg> добавляет руками при первом подключении):**

```json
{
  "name": "@capsuletech/web-ui",
  "exports": {
    ".": "./dist/index.js",
    "./docs.json": "./dist/docs.json",
    "./capsule": "./dist/capsule.js"
  }
}
```

`./docs.json` — opt-in. Пакет может не публиковать (private utility) — просто не добавлять в `exports`.

### 8.4 Composer — auto-discovery через `capsule.ts` {#distribution-composer}

**Producer-side контракт** (в пакете):

```ts
// packages/web/kit/ui/src/capsule.ts
export default {
  components: { ui: { Button, Input, /* ... */ } },
  controllers: { /* ... */ },
  docs: () => import('@capsuletech/web-ui/docs.json'),  // ← НОВОЕ
};
```

`docs: () => Promise<IDocsChunk>` — lazy import (не блокирует initial bundle).

**Composer-side контракт** (в `@capsuletech/web-docs`):

- Тот же auto-import что регистрирует UI/controllers per ADR 033 регистрирует и `docs`.
- На первый запрос (`<DocSection>` mount или `useDoc()` вызов) — composer лениво резолвит все promise'ы → мерджит в `IDocsRegistry` → memoize'ит.
- Slug-коллизии между пакетами — error (build-time через cross-package check §8.8 + runtime через assert в composer'е).

**Manual fallback** (для пакетов без `capsule.ts`):

```ts
import { Docs } from '@capsuletech/web-docs';
import externalDocs from 'some-pkg/docs.json';

Docs.register(externalDocs);
```

Не основной путь — escape-hatch. Не используется в capsule-монорепо.

**Public API сохраняется:** `<DocSection slug=…/>`, `<DocPage slug=… audience=…/>`, `useDoc(slug)`. Менять контракт не предполагается.

### 8.5 Slug namespace (для package-level и unit-level docs) {#distribution-slug}

`<pkg-short>/<unit>` где `pkg-short` = npm-name без `@capsuletech/` префикса.

| Файл | Slug | strategy |
|---|---|---|
| `packages/web/kit/ui/README.md` | `web-ui` | `package` |
| `packages/web/kit/ui/src/primitives/button/README.md` | `web-ui/button` | `package` |
| `packages/web/boost/layout/src/matrix/README.md` | `web-layout/matrix` | `package` |
| `apps/playground/README.md` | `app/playground` | `app` |
| `docs/01-architecture/adr/048-docs-as-data.md` (root pkg `@capsuletech/docs`) | `architecture/adr/048-docs-as-data` | `docs` (см. §5.1) |

**`package` strategy:**
1. `pkg-short` = `<pkgName>`.replace(`@capsuletech/`, ``) (или generic: всё после последнего `/`).
2. Path относительно package root, `src/`-префикс strip'ается.
3. Numeric prefix у директорий strip'ается (как §5.1).
4. Если file basename = `README.md` — берётся имя родительской директории как `<unit>`.
5. Package root `README.md` → slug = `<pkg-short>` (без `<unit>`).

**`app` strategy:** аналогично `package` но `pkg-short` = `app/<appName>`.

Свойства:
- стабильно при перемещении пакета между zones (npm-name не меняется);
- не зависит от внутренней структуры пакета (`src/primitives/...`);
- не коллидится с slug'ами корневого `@capsuletech/docs` пакета.

### 8.6 Frontmatter расширения для package/unit docs {#distribution-frontmatter}

Поверх §2:

- `package: @capsuletech/web-ui` — npm-name (опц., движок derive'ит из `package.json` если не задан).
- `unit: button` — короткое имя юнита (опц., движок derive'ит из path если не задан).

Эти поля попадают в `meta` секцию registry — composer'у не нужны (slug уже несёт инфу), но полезны для дебага / поиска / тулинга.

### 8.7 Корневой `docs/` как `@capsuletech/docs` {#distribution-root}

`docs/` (ADR, architecture, _meta) становится пакетом `@capsuletech/docs` в `packages/docs/`. Та же модель что и любой пакет:

- собственный `build` с `DocsExtractPlugin` (`slugStrategy: 'docs'` — slug per §5.1).
- эмитит `dist/docs.json`, экспортит через `./docs.json`.
- регистрируется через `capsule.ts` так же как web-ui.

Спец-случая «корневая папка обрабатывается иначе» нет. После Phase 3 `docs/_build/extract.mjs` удаляется.

**Slug-coexistence:**
- root-пакет → slug'и без префикса (`architecture/adr/052-docs-builder-per-package`)
- per-package → slug'и с pkg-prefix (`web-ui/button`)

Коллизий нет — namespace'ы не пересекаются.

### 8.8 Cross-package wikilink CI check {#distribution-wikilinks}

**Per-package build** — резолвит только локальные wikilinks. Внешние (`[[web-ui/button]]` из `@capsuletech/docs`) сохраняются в `wikilinks: string[]` секции без резолва.

**Composer runtime** — после мерджа всех registries резолвит cross-package wikilinks. Упавшие → warning в dev console, error в production build.

**Capsule CI** — отдельная job, отдельный скрипт:

```bash
pnpm docs:check-graph    # → node scripts/docs-check-graph.mjs
```

Что делает:
1. Ждёт что все пакеты сбилдены (`packages/**/dist/docs.json` существуют).
2. Импортит каждый.
3. Мерджит в whole-graph registry.
4. Резолвит wikilink-граф, error на упавшие.

В CI это **отдельная job** `docs:check-graph` рядом с `compliance:check` / `lint` / `typecheck` / текущим `Docs build (ADR 048 E6)`. Падение = failed PR.

**НЕ внутри `@capsuletech/docs` build** — иначе пакет docs начинает зависеть от других пакетов, нарушает зону.

**Внешний пользователь capsule:** опционально через `capsule docs check` CLI (обёртка над тем же скриптом, конфигурируется через capsule.config.ts). Не обязательно — external projects могут не хотеть cross-package валидации.

### 8.9 Exclusion patterns (по умолчанию) {#distribution-exclusions}

Skip-list движка (apply'ится в `extractDocs` всегда, override-able):

- `OWNERSHIP.md`, `CHANGELOG.md`, `LICENSE.md`
- `node_modules/**`, `dist/**`, `.capsule/**`, `__tests__/**`, `__fixtures__/**`, `.generated/**`
- `*.draft.md` (опциональный шаблон для работы-в-процессе)

**Per-package override:**
```ts
DocsExtractPlugin({
  exclude: ['src/internal/**/*.md', 'CONTRIBUTING.md'],  // ДОПОЛНИТЕЛЬНО к defaults
});
```

**`.md` без frontmatter:**
- match'ит default exclusion → skip silently;
- иначе → warn (видно в build log), `extractDocs` всё равно пропускает файл;
- никогда не error (legacy не валит build).

Frontmatter валидируется по §2 contract — `title`/`status`/`tags`/`last_updated` обязательны для включения в registry.

## 9. Что НЕ canon (out of scope) {#out-of-scope}

- **MDX (JSX в .md)** — отложено (ADR 048 D7 + Альтернативы)
- **i18n** — отложено
- **Versioning docs** (как docusaurus version-tabs) — отложено
- **Per-doc rendering pipeline** (rehype → JSX) — E5 решение, не E1

## 10. Связанное {#related}

- [[../01-architecture/adr/052-docs-builder-per-package|ADR 052]] — distribution canon (D1–D6); этот файл — implementation contract.
- [[048-docs-as-data|ADR 048]] — обоснование и контекст (D1–D3, D6, D7 — canon; D4–D5 — заменены ADR 052).
- [[briefs/owner-builders-docs-colocation|brief — per-package distribution]] — execution plan (Phase 0–6).
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D5 — colocation rule.
- [[033-package-registration|ADR 033]] — registration pattern, применяется к docs composer'у (§8.4).
- [[web-rework-plan]] Phase E — execution status.
- `docs/_build/extract.mjs` — **УДАЛЁН** (ADR 052 Phase 3, 2026-06-16). Заменён `@capsuletech/docs` пакетом.
- `packages/docs/dist/docs.json` — produced artifact (per-package форма; ADR 052 Phase 3 done).
- `docs/.generated/registry.ts` — legacy artifact (больше не генерируется; файл можно удалить при следующей очистке).
