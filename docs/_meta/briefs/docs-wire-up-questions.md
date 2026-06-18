---
title: docs system wire-up — open questions before first consumer
description: Чеклист вопросов / гэпов между текущим состоянием docs-builder + web-docs и первым реальным consumer'ом (ReadmeBlock / playground). Зоны затронуты — owner-builders (engine + per-package plugin wiring), main (web-docs runtime + composer стратегия), owner-web-ui (per-primitive README emit), main+owner-web-studio (ReadmeBlock wiring).
status: draft
last_updated: 2026-06-17
tags: [brief, docs, ADR-052, wire-up]
---

# Brief — docs system wire-up — open questions

> **READ FIRST:** `docs/_meta/docs-system.md` (§8 — per-package distribution canon), `docs/01-architecture/adr/052-docs-builder-per-package.md`, `packages/web/docs/OWNERSHIP.md`.

## Контекст {#context}

Движок (`@capsuletech/docs-builder`) и runtime (`@capsuletech/web-docs`) — готовы. Root vault'а `docs/` уже бандлится в `@capsuletech/web-docs/docs.json` (3.3 MB), subpath работает. Public API: `<DocsProvider registry>` + `<DocSection slug>` + `<DocPage slug>` + `useDoc()`.

Studio info-panel имеет `ReadmeBlock` placeholder (`packages/web/studio/src/info/ReadmeBlock.tsx`) — ждёт wiring. `Button` примитив имеет `README.md` с frontmatter готовый к extract'у. Реальных live-consumer'ов пока нет.

Прежде чем подключать **первого** consumer'а — нужно закрыть пять вопросов. Они затрагивают несколько зон, ответ на каждый меняет execution plan.

## Open questions {#questions}

### Q1 — Composer / auto-discovery {#q1-composer}

ADR 052 §8.4 описывает merge per-package `docs.json` через `capsule.ts` registration (ADR 033):

```ts
// packages/web/kit/ui/src/capsule.ts
export default {
  components: {...},
  docs: () => import('@capsuletech/web-ui/docs.json'),
};
```

→ composer (`@capsuletech/web-docs`) лениво резолвит promise'ы, мерджит в один `IDocsRegistry`, отдаёт через `<DocSection>`.

**Текущее состояние web-docs runtime:** только `<DocsProvider registry={...}>` с **одним** registry. Auto-discovery / merge внутри пакета нет — есть только Context.

**Вопросы:**
- Это «не реализовано, надо делать», или решили оставить merge explicit на стороне app (`{ ...rootDocs, ...webUiDocs }` руками)?
- Если auto-discovery — кто его делает: owner-builders в `vite-builder`'е (как UI-композиция через ADR 033), или main в web-docs (свой scanner)?
- Если explicit merge — нужен ли helper `mergeDocs(...registries: IDocsRegistry[])` с slug-collision-check (§8.8) в web-docs?

### Q2 — `type → slug` mapping для ReadmeBlock {#q2-type-to-slug}

Inspector выбирает ноду `'ui.Button'`. ReadmeBlock получает `type: 'ui.Button'`. Чтобы дёрнуть `<DocSection slug="web-ui/button"/>` — нужно правило `'ui.X' → '<pkg-short>/<x>'`.

**Варианты:**
1. **Поле `docSlug?: string` в `IComponentManifest`.** owner-web-ui проставляет руками per-primitive (`ButtonManifest.docSlug = 'web-ui/button'`). Эксплисит, скучно, но безотказно. Manifest всё равно живёт рядом с компонентом — owner естественный.
2. **Конвенция `'ui.X' → '<owner-pkg-short>/<x-lower>'`.** Маппинг лежит в ReadmeBlock'е / composer'е, никто ничего не проставляет руками. Хрупко при ре-неймах / нестандартных pkg-short.
3. **`docSlug` derive'ится из `package` + `unit` фронтматтера README'шки.** Composer строит обратный индекс `manifest.type → slug`. Хочется, но требует чтобы README знал свой `type` (новое поле во frontmatter `component: 'ui.Button'`).

Какой вариант принять каноном? Если (1) — это правка типа `IComponentManifest` (owner-builders, web-ui/manifest). Если (3) — расширение frontmatter contract (owner-builders / docs-system.md §8.6).

### Q3 — Per-package extract в `@capsuletech/web-ui` {#q3-web-ui-extract}

У Button README уже есть. Но `packages/web/kit/ui/vite.config.mts` НЕ подключает `DocsExtractPlugin` → `dist/docs.json` web-ui не эмитится → composer'у нечего показывать даже если Q2 решён.

**Решения:**
- Подключаем `DocsExtractPlugin` в web-ui сейчас (одна правка `vite.config.mts` + `exports['./docs.json']` в `package.json`). owner-web-ui.
- Аналогично — все остальные пакеты которые потенциально будут иметь README'шки (на скольких пакетах сейчас есть README с frontmatter? — надо аудит).

Делаем волной (один PR — все пакеты подключаются), или по одному по мере появления README'шек? Если волной — кто координирует (main + owner-builders → инструкция-шаблон для всех owner'ов).

### Q4 — Первый live consumer {#q4-first-consumer}

Где первое реальное подключение делаем — варианты:

- **A: studio ReadmeBlock.** Узкий, но требует Q1+Q2+Q3 решёнными. Studio info-panel начнёт показывать README primitive'а. Близко к user-value (видно в редакторе).
- **B: apps/playground страница ADR.** Простейший — `<DocPage slug="architecture/adr/048-docs-as-data"/>` где-нибудь, registry — root vault. Тестит только runtime, не трогает Q2/Q3. Меньше user-value, но «жизнь» через docs быстрее.
- **C: оба параллельно** — playground как dogfood root-vault, studio ReadmeBlock как dogfood per-package. Долго, но canon будет проверен с двух сторон.

Кажется правильным **B сначала** (минимум блокеров, быстрый smoke на runtime), потом **A** (требует Q1-Q3). Подтвердить.

### Q5 — `docs-consumer-integration.md` устарел {#q5-outdated-guide}

Guide `docs/_meta/docs-consumer-integration.md` описывает старый flow:
- `@capsule/docs-registry` alias → `docs/.generated/registry.ts` (Step 2/3).
- Этого alias'а нет, файла нет (Phase 3 удалил `docs/_build/extract.mjs` и `.generated/`).

После Phase 3.6 правильный flow: `import rootDocs from '@capsuletech/web-docs/docs.json'` + `<DocsProvider registry={rootDocs}>`.

Обновить guide — часть текущей задачи или отдельный PR? Обновлением занимается main (доки) или owner-builders (как owner движка)?

## Замечания (наблюдения, не блокеры) {#observations}

- **Root vault docs.json — 3.3 MB.** Полный bundle, без code-splitting. App grabber загружает всё. Когда дойдём до больших vault'ов или эфемерных consumer'ов — захочется lazy per-doc loading. Не сейчас, но note: контракт `<DocsProvider registry={...IDocsRegistry}>` сразу с eager-объектом — это закрывает дорогу к streaming/lazy без breaking change. Подумать в Q1.
- **Wikilinks raw в runtime.** Markdown source имеет `[[slug|alias]]`, рендерится как-есть в HTML. Когда подключим studio ReadmeBlock и user увидит `[[other-component]]` сырым — будет вопрос «где навигация». Roadmap web-docs уже это знает (post-launch task), но возможно стоит ускорить, если первый consumer — visible to user.
- **Audience filter.** `<DocSection audience={['dev']}>` есть. Studio = `audience: 'dev'`, playground страница ADR = `audience: 'user'` для конечного-юзера-фреймворка. Уточнить дефолт.

## Решения {#decisions}

Обсуждено 2026-06-17 (main + user).

### Q1 — config-driven sources через capsule.app.ts (НЕ auto-discovery, НЕ explicit Provider prop) {#q1-decision}

App объявляет в `capsule.app.ts`:

```ts
defineAppConfig({
  packages: [...],          // runtime auto-discovery — как сейчас
  docs: {                   // ← присутствие поля = опт-ин в docs wiring
    rootVault: true,        // подключить @capsuletech/web-docs/docs.json (корневой vault)
    packages: ['@capsuletech/web-ui'],  // ЯВНЫЙ список пакетов чьи docs.json подключаем
  },
});
```

**Без поля `docs:` → docs-плагин не активируется**, .capsule/registry/docs-sources.ts не генерится, regular app — чистый.

**С полем `docs:` →** новый Vite plugin (owner-builders) читает конфиг, проверяет наличие `./docs.json` export'а в `package.json` каждого указанного пакета, эмитит `.capsule/registry/docs-sources.ts`:

```ts
export const docsSources = {
  root:    () => import('@capsuletech/web-docs/docs.json'),
  'web-ui':() => import('@capsuletech/web-ui/docs.json'),
};
```

**Web-docs runtime** подбирает сгенерированную карту через canon (как остальные registries). `<DocSection slug="web-ui/primitives/button"/>` парсит slug → берёт loader из карты → lazy `import()` → cache → render. `<DocsProvider>` больше **не требует** prop `registry` (зарезервировать сигнатуру с deprecation если в OWNERSHIP уже задокументировано).

App пишет только `<DocSection slug=".."/>` — без импортов json.

**Зарезервировать** под будущее: возможность `asyncRegistry` / streaming-варианта (на случай больших vault'ов или split'а корневого vault'а на части). Не реализовывать сейчас, но не закрывать API на eager-only.

### Q2 — `docSlug?: string` на `IComponentManifest` {#q2-decision}

```ts
// packages/web/kit/ui/src/primitives/button/button.manifest.ts
{
  type: 'ui.Button',
  package: '@capsuletech/web-ui',
  subpath: 'button',
  docSlug: 'web-ui/primitives/button',  // ← optional, явный slug
  ...
}
```

Inspector ReadmeBlock читает `manifest.docSlug` → `<DocSection slug={manifest.docSlug}/>`. Поле отсутствует → плейсхолдер «README не подключён».

**Без конвенций** (никакого автогенерации из `type` + `package` — хрупко при composite'ах, custom-пакетах, переименованиях). Без обратного индекса через frontmatter README'шки (лишний канал). Manifest и README живут соседями — owner ставит руками один раз.

### Q3 — гибрид: web-ui сейчас + on-demand остальные + one-pager playbook {#q3-decision}

- **Web-ui получает extract сейчас** — уже в Phase 4 WIP (vite.config.mts + `./docs.json` export + dep на docs-builder).
- **Остальные пакеты подключают плагин когда их owner пишет первый README** — превентивно не подключаем (эмит `0 docs, 0 warnings` = шум).
- **owner-builders пишет one-pager** `docs/_meta/per-package-docs-setup.md` — 4 шага копипасты:
  1. `pnpm add -D @capsuletech/docs-builder` (workspace).
  2. Импорт + `plugins: [DocsExtractPlugin()]` в vite.config.mts пакета.
  3. `"./docs.json": "./dist/docs.json"` в `package.json:exports`.
  4. Написать README.md рядом с компонентом → build → готово.

### Q4 — полный стек до ReadmeBlock, потом тест {#q4-decision}

Идём по пути **A (studio ReadmeBlock)** напрямую, без промежуточного «smoke на playground». Последовательность задач:

1. **Q1 импл** — Vite plugin (owner-builders) + IAppConfig типизация (owner-builders) + web-docs runtime читает сгенерированную карту, делает lazy (main).
2. **Q3 импл** — Phase 4 WIP коммитится (extract в web-ui, Button README) — owner-web-ui.
3. **Q2 импл** — `docSlug?: string` в `IComponentManifest` + проставить у Button — owner-web-ui (+ owner-builders если тип живёт в kit/manifest и зачем-то трогает kit-зону).
4. **ReadmeBlock wiring** — в studio info-panel читает `manifest.docSlug`, рендерит `<DocSection>` через web-docs — main + owner-web-studio.
5. **Playground opt-in** — `apps/playground/capsule.app.ts` получает `docs: { rootVault: true, packages: ['@capsuletech/web-ui'] }`. Запускаем — видим Button README в инспекторе. main.

### Q5 — guide пишется в конце (после Q4 step 5) {#q5-decision}

`docs/_meta/docs-consumer-integration.md` переписывается **после того как Step 5 работает**, отражая реальный flow. Не до — guide дрейфует от реализации между «написать» и «доделать». Owner: main.

### Side observations addressed {#observations-decisions}

- **3.3 MB root vault.** На сейчас приемлемо. asyncRegistry / split корневого vault'а — зарезервировано в Q1 (API не запираем на eager-only), но не делаем сейчас. Followup-задача на main когда дойдём до больших vault'ов.
- **Wikilinks raw.** Поднимаем приоритет с post-launch до **внутри Q1 импл** — раз первый consumer = ReadmeBlock visible to user, raw `[[slug|alias]]` в HTML = плохой UX. Простая правка `render-markdown.ts`: marked extension которая `[[slug|alias]]` → `<a href="#slug">alias</a>` или `[[slug]]` → `<a href="#slug">slug</a>`. main.
- **Audience filter default.** Studio ReadmeBlock — `audience={['dev']}` дефолтом (читают разрабы). Playground ADR-страница (если когда-то появится) — `audience={['user']}` дефолтом. Зафиксировать в guide (Q5).

## Execution table {#execution}

| Q | Решение | Кто делает |
|---|---|---|
| Q1 — config-driven sources | Vite plugin + IAppConfig поле `docs.{rootVault, packages}` + web-docs runtime lazy via slug-prefix + wikilink rewrite в render-markdown | owner-builders (plugin + type), main (web-docs runtime + wikilink) |
| Q2 — type → slug | `docSlug?: string` на IComponentManifest, owner проставляет руками | owner-web-ui (manifest type + Button manifest), main коорд |
| Q3 — per-package extract | гибрид: web-ui сейчас (мой Phase 4 WIP), остальные on-demand, owner-builders пишет one-pager | owner-web-ui (web-ui сейчас), owner-builders (one-pager), позже — каждый owner X |
| Q4 — first consumer | сразу полный стек A до ReadmeBlock в studio, тест в playground | main + owner-web-studio |
| Q5 — guide update | переписать после Q4 step 5 (на живой системе) | main |

## Связанное {#related}

- `docs/_meta/docs-system.md` §8 (per-package distribution canon)
- `docs/01-architecture/adr/052-docs-builder-per-package.md`
- `packages/web/docs/OWNERSHIP.md` (web-docs runtime owner = main)
- `packages/builders/docs-builder/` (engine owner = owner-builders)
- `docs/_meta/briefs/owner-builders-docs-colocation.md` (execution plan engine)
