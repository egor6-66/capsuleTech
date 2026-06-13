---
tags: [hca, adr, proposed, docs, infrastructure, projection]
status: proposed
date: 2026-06-11
last_updated: 2026-06-12
---

> [!info] Status
> **Proposed** — 2026-06-11. Sister-ADR к [[046-boost-namespace-matrix-evict-vt-owner|046]] и [[047-frontend-architecture-zones-cycle-vendor|047]]. Триада ландит одной волной.
>
> Этот ADR — про **документацию как данные**: один markdown source, многоаудиторные проекции, build-time извлечение в типизированный registry, JSX-консумерс через `@capsuletech/studio/docs`.

# ADR 048 — Docs as data: single MD source + multi-audience projection

## Контекст {#context}

### Pain 1 — Несколько аудиторий, одна тема, риск дрейфа {#pain1}

Capsule приходит к точке когда документация ходовая:
- **Agent context** — owner-агенты читают `.md` как system prompt
- **Developer portal** — рендер docs внутри capsule-приложений (capsule-сайт, capsule-test, внешние юзеры) 
- **User TL;DR / summaries** — упрощённые выжимки для не-разработчиков
- **Business reports** — выгрузки для накладной/sales/legal
- **JSX-секции** — выводить кусок ADR прямо в компоненте (Footer-info, About-page, etc.)
- **PDF / printable** — long-term, white-papers

Сейчас всё одной формой — `.md` в `docs/`. Если завести **несколько вариантов одной темы** (агентский vs пользовательский) — потенциальный **дрейф**. Source-of-truth расщепляется → правки одной не доходят до другой → информация становится неверной.

### Pain 2 — Программно неудобно консьюмить .md {#pain2}

JSX-компонент в апп не может «import section from doc.md». Markdown — opaque text-blob с программной точки зрения. Скопировать раздел руками — антипаттерн (дубликат → дрейф).

### Pain 3 — Wikilinks не валидируются {#pain3}

`[[name]]` ссылки разбросаны по всему `docs/`. Если target-нод переименован — никто не сообщит. Linkrot.

### Pain 4 — Markdown оптимален для агента, **не лимит** {#pain4}

Часто вопрос: «MD оптимален для LLM?». Ответ — **да**. LLM обучены на гигантских MD-корпусах (GitHub README, StackOverflow, docs). Структура (`##`, lists, tables, code-blocks) — для них **семантические якоря**, не косметика. JSON/YAML программно строже но менее token-efficient для prose-content + менее читаемы человеком. AsciiDoc/RST — мощнее но LLM-corpus меньше.

**Вывод по pre-conditioning:** формат остаётся `.md`. Решение — **не менять формат**, а **достроить programmatic-layer над ним**.

## Решение {#decisions}

### D1 — Single markdown source-of-truth {#D1}

`docs/**/*.md` — **остаются как есть**, никаких альтернативных форматов. Agent ingest работает без изменений. Obsidian-vault работает без изменений. Wikilinks работают.

### D2 — Section-ID convention (стабильные anchors) {#D2}

Каждая значимая секция получает **explicit ID** через расширение синтаксиса heading'а:

```markdown
## Decision 1 — Boost namespace {#D1}
## Decision 2 — Matrix evict {#D2}
## Roll-out {#rollout}
```

`{#id}` — конвенция (поддерживается Obsidian + большинство MD-parser'ов). Slug стабилен — даже если heading-текст переписан, id не меняется → JSX-консумер не ломается.

### D3 — Audience-tagging через HTML-комменты {#D3}

Внутри секций — **audience-теги** через HTML-комменты:

```markdown
## Decision 1 — Boost namespace {#D1}

<!-- audience: agent,dev,user -->
Booster-пакеты получают `@capsuletech/boost-*` namespace.
<!-- /audience -->

<!-- audience: dev -->
Технически — это переименование `name` поля в package.json + обновление tsconfig.base.json paths + alias-period для downstream.
<!-- /audience -->

<!-- audience: user,report -->
До: 4 разрозненных «web-table/map/flow/charts» пакетов без явной семантики.
После: явная booster-зона `@capsuletech/boost-*` — заявлено что это расширения базовых примитивов.
<!-- /audience -->
```

Аудитории:
- `agent` — для LLM-агентов capsule (owner-* агенты, главный agent)
- `dev` — для разработчиков (внутренние + внешние OSS-консьюмеры)
- `user` — для конечных пользователей capsule-приложений (упрощённый язык)
- `report` — для бизнес-выгрузок (sales, legal, accounting)

Один блок может быть в нескольких аудиториях (`audience: agent,dev`). Если у секции **нет** audience-тегов — она доступна **всем** (default).

**Агентский ingest** — теги остаются в файле как HTML-комменты, агенту прозрачны (LLM их парсят как мета без проблем). Можно опционально strip'ать в pipeline, но не обязательно.

### D4 — Build-time extraction → typed registry {#D4}

Скрипт (`docs/_build/extract.mjs`) запускается по `pnpm docs:build`:

1. Walks `docs/**/*.md`
2. Парсит frontmatter (`unified` + `remark`)
3. Парсит секции по heading'ам, забирает `{#id}` если есть, генерирует stable-slug если нет
4. Парсит `<!-- audience: X -->` блоки
5. Резолвит `[[wikilink]]` против registry — упавшие → ошибка
6. Эмитит `docs/.generated/registry.ts`:

```ts
export const docs = {
  'adr/046': {
    meta: {
      status: 'proposed',
      date: '2026-06-11',
      tags: ['hca', 'adr', 'proposed', 'packages'],
    },
    sections: {
      D1: {
        heading: 'Decision 1 — Boost namespace',
        body: '...markdown source...',
        bodyHtml: '...rendered html...',
        audience: ['agent', 'dev', 'user'],
        wikilinks: ['044-web-menu-package'],
      },
      D2: { ... },
    },
  },
  // ...
} as const;

export type DocSlug = keyof typeof docs;
export type SectionSlug = `${DocSlug}#${string}`;
```

Registry **типизирован**. Consumers получают autocomplete + compile-time checks.

### D5 — `@capsuletech/studio/docs` consumer {#D5}

`@capsuletech/studio` (за rename из ADR 047 D4) subpath `/docs` экспортит:

```tsx
import { DocSection, DocPage, useDoc } from '@capsuletech/studio/docs';

// Конкретная секция
<DocSection slug="adr/046#D1" />

// Вся дока, без фильтра
<DocPage slug="adr/046" />

// Фильтр по аудитории
<DocPage slug="adr/046" audience="user" />

// Programmatic access
const adr = useDoc('adr/046');
const summary = adr.sections.D1.body;
```

Компоненты — Solid JSX (через web-renderer markdown-renderer'а или прямого rehype-output). Стили — через web-style (наследует консьюмер-приложение, ничего особенного).

### D6 — CI drift-guards {#D6}

`pnpm docs:build` — становится частью CI:

1. **Wikilink-резолв** — упавшие линки = CI fail.
2. **Section-ID коллизии** — два секции с одним id в одном файле = fail.
3. **Audience-теги** — незакрытые / unknown audience = fail.
4. **Renames** — section-id renamed без legacy-alias = fail (sentry-file `docs/_build/legacy-aliases.json` хранит `old-id → new-id` mapping; alias-period 1 major).

Drift = 0 because consumers binding к section-id через типизированный registry; rename без alias ломает CI ДО merge'а.

### D7 — Per-doc co-location {#D7}

Per [[047]] D5 (colocation): не выносим docs в отдельные «agent-docs/» / «dev-docs/» / «user-docs/» директории. ONE `docs/` tree, audience-теги решают.

## Что НЕ решает ADR 048 (явно вне scope) {#non-goals}

- **Markdown расширение MDX (JSX в .md)** — пока пробуем без MDX. Если live-demo внутри ADR станут massive нуждой — отдельный sub-ADR. Сейчас registry + JSX в апп-консумере достаточно.
- **Localization** — i18n docs (русский/английский варианты) — обсуждается отдельно. Audience не = language.
- **Версионирование docs** (как docusaurus version-tabs) — если приходит — добавляется отдельно через frontmatter `version: '0.1'`.
- **Перевод сэмплов** в business-formats (PDF/Word/...) — это отдельная projection-задача, base registry достаточно.
- **Поиск по docs** — registry готов для full-text-search, но реализация поиска — отдельный feature.
- **Markdown source rewrite** — не переписываем `[[wikilinks]]` или structure. Только дополняем `{#id}` + audience-теги по мере касания (touch-once).

## Последствия {#consequences}

**+** Один source — никаких дубликатов. Drift = 0.
**+** Agent ingest без изменений. Markdown остаётся оптимальным для LLM.
**+** JSX-консумерс через типизированный API. Editor catches опечатки.
**+** Wikilink-валидация — linkrot исключён.
**+** Future-proof: новые аудитории (легал? мобильная-доку?) — добавление audience-тега, не переписывание.
**+** Co-located docs — никакого dедлайн-разделения.

**−** Build-step добавляется. `pnpm docs:build` запускается на CI + локально перед PR. Скрипт сам не сложный (200 строк unified-rehype-pipeline), но maintenance trade-off.
**−** Конвенция `{#id}` + `<!-- audience: ... -->` требует обучения contributors. Документируется в CLAUDE.md + новый AI-anchor `docs/_meta/docs-system.md`.
**−** Существующие docs **не переписываются** — `{#id}` + audience добавляются **touch-once** при первой правке. До этого consumers binding к sections **fallback'нется** на heading-slug (нестабильный).
**−** Wikilink-резолв требует валидного link-graph. Сначала **inventory pass** — fix all current broken links (or convert to plain text). Может вскрыть скрытые проблемы в docs/.

## Roll-out {#rollout}

См. plan-doc Phase E.

Phase E (docs infrastructure) — параллельна Phase D, после A0:

- **E1 — Setup `docs/_build/extract.mjs` + `pnpm docs:build` script.** Main steward / owner-builders (зависит от complexity Vite-integration). Без consumers — registry просто эмитится, никто не consume'ит.
- **E2 — Section-ID inventory pass** — пройти по существующим `docs/01-architecture/adr/*.md`, добавить `{#id}` к Decision-секциям + Roll-out + Open questions. ADR 046/047/048 уже могут иметь стабильные ID (см. их draft'ы). Главный steward.
- **E3 — Audience-tagging существующих docs** — низкий приоритет, touch-once при касании.
- **E4 — `@capsuletech/studio/docs` consumer пакет/subpath** — после rename studio (ADR 047 D4). Owner — `owner-studio`.
- **E5 — Apps consume** — playground / future capsule-сайт показывают `<DocSection>`.
- **E6 — CI drift-guards** — `pnpm docs:build` встроен в CI job (отдельный или в Test job).

## Альтернативы (rejected) {#alternatives}

- **MDX (Markdown + JSX inline)** — даёт interactive docs (live-demo внутри ADR). Trade-off: .md файл становится менее agent-friendly (LLM видит JSX-разметку). Для сейчас — не критично; если live-demo станут массивы — отдельный sub-ADR введёт MDX-режим для специфических файлов.
- **JSON/YAML как source-of-truth** — docs пишутся как структурированные объекты. Программно идеально, но human-edit недружелюбно + LLM-ingest хуже. Отвергнуто.
- **TypeScript-as-docs** (пишем docs как TS-литералы с типизацией) — самое программно-строгое, но автору доку — кошмар. Отвергнуто.
- **Multiple separate files per audience** — `adr-046-agent.md` + `adr-046-user.md` + `adr-046-report.md`. **Это и есть pain 1** — drift гарантирован. Отвергнуто.
- **Astro Content Collections / Contentlayer / Nextra / Velite** — proven CMS-like tools для MD → registry. Один из них **может** быть выбран как реализация D4 extractor вместо собственного скрипта; owner-builders решит при E1. ADR не запрещает.
- **Wikilink resolver через JS-плагин в Obsidian** — работает только в Obsidian-IDE, не в CI / не в build. Отвергнуто.

## Open questions {#open-questions}

- **Конкретный MD-parser** для D4 — `unified`+`remark`+`rehype` стандартно подходит. Astro/Velite предлагают готовые pipeline'ы. Owner-builders decides на E1.
- **Registry shape long-term** — flat `docs[slug].sections[id]` сейчас; если docs дерево станет deep (категории / serials), добавим nested. Не trigger сейчас.
- **`audience: agent` vs default** — может ли быть «agent-only» секции (debug, internal)? Думаем: да, audience-тег `agent` без `dev`/`user` означает скрытую (только агент видит). Решаем по реальным кейсам.
- **Performance build-time** — для 100+ MD-файлов pipeline должен укладываться < 5 сек. Если медленно — incremental extraction (watcher).
- **Связь с web-renderer** — DocSection может рендериться через `@capsuletech/web-renderer` (rehype-tree → IEditorNode → JSX). Или прямой rehype-stringify → Solid. Owner-studio решит на E4.

## Ссылки {#related}

- [[046-boost-namespace-matrix-evict-vt-owner|ADR 046]] (sister, точечная rework)
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] (sister, broad architecture)
- [[045-web-taxonomy|ADR 045]] (#2 absorb ui-creator подтверждается)
- [[033-package-registration|ADR 033]] (registry-pattern перекликается с docs-registry)
- [`docs/_meta/web-rework-plan.md`](../../_meta/web-rework-plan.md) (live execution)
