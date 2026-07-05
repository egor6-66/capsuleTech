---
name: @capsuletech/web-docs
owner-agent: main
group: web_base
zone: runtime
status: alpha
priority: P2
last-updated: 2026-06-16
---

# @capsuletech/web-docs

Solid runtime для docs-as-data registry — `<DocsProvider>` / `<DocSection>` / `<DocPage>` / `useDoc()` + bundled root-vault `dist/docs.json`.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — Solid-runtime пакет, browser-side.
- **Status:** `alpha` — извлечён из `@capsuletech/web-studio/docs` per ADR 052 Phase 3.6 (PR feat/web-docs-package).
- **Priority:** `P2` — runtime готов, но пока без live-consumer'ов (studio/ReadmeBlock — placeholder; ждём wiring).
- **Maturity bar (alpha → beta):**
  - Live consumer в apps/playground или studio info-panel.
  - Syntax highlighting (marked-extension).
- **Active blockers:** нет.
- **Roadmap:**
  - `[x]` Wikilink → `<a class="wikilink" data-ref="id">` rewrite (2026-07-05).
  - `[x]` Obsidian-callouts → `<div class="callout callout-<type>">` (2026-07-05).
  - `[ ]` Syntax-highlighting через marked-extension.
  - `[ ]` Variant: `<DocSection>` без `DocsProvider` (inline registry prop).
- **Last activity:** 2026-07-05 — callouts + wikilink semantic rewrite в `render-markdown`.

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`) — fine-grained reactivity для `<DocSection>` / `<DocPage>`. https://www.solidjs.com/
- **marked** (`marked` `^9.1.6`) — markdown → HTML рендер. https://marked.js.org/
- **docs-builder** (`@capsuletech/docs-builder` workspace) — типы (`IDocsRegistry`, `IDocEntry`, …) + extract-plugin для bundled root-vault docs.json.

## Зона ответственности

### Owns
- `packages/web/docs/src/` (полностью)
- `packages/web/docs/vite.config.mts` (extract-plugin для root-vault docs.json)
- `packages/web/docs/vitest.config.ts`
- `packages/web/docs/package.json` exports / deps
- `packages/web/docs/OWNERSHIP.md` (этот файл)

### Не трогает
- `@capsuletech/docs-builder` (engine) — зона `owner-builders`.
- `@capsuletech/web-studio` — info-panel может консумить web-docs, но wiring владеет studio.
- Корневой `docs/` markdown vault — это контент, не код пакета (только потребляется через extract-plugin).

## Публичный API

`package.json:exports`:
- `.` — runtime: `DocsProvider`, `DocSection`, `DocPage`, `useDoc`, `useDocsRegistry` + re-export типов `IDocsRegistry` / `IDocEntry` / `IDocSection` / `IDocMeta` / `IAudience` / `IDocStatus` из `@capsuletech/docs-builder`.
- `./docs.json` — bundled root-vault registry (build-time artifact от `DocsExtractPlugin({ root: <repo>/docs })`).

**Контракт типов** — single source of truth: `@capsuletech/docs-builder`. Этот пакет НЕ переобъявляет shape. Любые правки `IDocsRegistry` идут через owner-builders.

## Quirks / gotchas

- **`marked` синхронный.** `renderMarkdown` кастит `parse(md) as string` — это корректно при синхронной конфигурации (`gfm: true, breaks: false`). Async-extensions сломают каст. См. `src/render-markdown.ts`.
- **Markdown source — controlled.** `<DocSection>` / `<DocPage>` рендерят результат через `innerHTML` без санитизации. XSS не вектор: `docs/**/*.md` живёт в монорепе под git-review. **НЕ подключать user-supplied markdown в registry без санитизации.**
- **DocsProvider — required.** `useDoc()` / `<DocSection>` / `<DocPage>` бросают исключение вне `<DocsProvider>`. Это намеренно — typed registry это контракт, не optional.
- **Semantic-only rewrite.** `renderMarkdown` выдаёт СЕМАНТИКУ, не презентацию/поведение (канон разделения): wikilink `[[id]]`/`[[id|label]]` → `<a class="wikilink" data-ref="id">…</a>` **без href** (резолв пути и клик — зона потребителя, web-learn/studio Info); callout `> [!type] Title` → `<div class="callout callout-<type>"><p class="callout-title">…</p>…</div>` (`type ∈ info|tip|warning|note`, unknown → `note`). Стили — Prose (web-ui). `[[…]]` внутри code-блоков не трогается (inline-extension не заходит в codespan/fenced).

## План рефакторинга / оптимизаций

- [x] **Wikilink rewrite** — `[[id]]`/`[[id|label]]` → `<a class="wikilink" data-ref="id">` (semantic-only, no href) через marked-extension (2026-07-05).
- [x] **Obsidian callouts** — `> [!type] Title` → `<div class="callout callout-<type>">` через block-level marked-extension (2026-07-05).
- [ ] **Syntax highlighting** — code-blocks через `prismjs` или встроенный marked-highlight. (priority: low)
- [ ] **Standalone variant** — `<DocSection registry={...}>` без provider'а для one-shot use cases. (priority: low)
- [x] **Phase 3.6 extract** — вынесли из `@capsuletech/web-studio/docs` в свой пакет (2026-06-16).

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `src/__tests__/render-markdown.test.ts` | Wikilinks (semantic anchor, alias, escape, code-block untouched) + callouts (types, empty title, fallback, nested md, escape) + no-regression (tables/lists/mix). |
| Unit | `src/__tests__/audience-filter.test.ts` | Audience-block parser: matching, multi-line, multi-block, comma-lists. |
| Unit | `src/__tests__/DocSection.test.tsx` | Render section by slug, missing fallback, audience filter, custom fallback. |
| Unit | `src/__tests__/DocPage.test.tsx` | Render title + section order, missing slug fallback. |
| Unit | `src/__tests__/useDoc.test.tsx` | Hook lookup, missing slug → undefined, throw outside provider. |
| E2E | `packages/cli/e2e/smoke.mjs` | Косвенно — Vite-builder подхватывает пакет в exclude'е. |

**Перед изменением:** `pnpm --filter @capsuletech/web-docs test` должен быть green.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| Docs engine / extract-plugin / IDocsRegistry shape | owner-builders (`@capsuletech/docs-builder`) |
| Studio info-panel (consumer) | owner-web-studio / main |
| Lib-builder / Vite-plugin авто-attach | owner-builders |

## Release group

- **`web_base`** — fixed-versioning, tag `web@{version}`. Вместе с web-core/state/style/ui/router/renderer и т.д.

После изменений — координировать release через главного.
