---
tags: [hca, adr, proposed, docs, infrastructure, builders]
status: proposed
date: 2026-06-16
last_updated: 2026-06-16
---

> [!info] Status
> **Proposed** — 2026-06-16. Замещает D4 (extraction) и D5 (consumer) из [[048-docs-as-data|ADR 048]]. D1–D3 (single source / section-ID / audience), D6 (CI drift-guards), D7 (per-doc colocation) — остаются canon без изменений.
>
> Этот ADR — про **канал поставки доки**: где живёт движок, как пакет производит свой `docs.json`, как app/Studio композирует registry. Все правила парсинга и канон `docs-system.md` сохраняются.
>
> Бриф: [[../../_meta/briefs/owner-builders-docs-colocation|owner-builders-docs-colocation]].

> [!warning] Amendment 2026-06-16 (Phase 3.6) — viewer extract + `@capsuletech/docs` removed
> Топология упрощена с **3 пакетов → 2**:
>
> 1. **`@capsuletech/docs-builder`** (build-time engine + Vite plugin) — без изменений, в `packages/builders/`.
> 2. **`@capsuletech/web-docs`** (новый, `packages/web/docs/`) — Solid runtime (`DocsProvider`, `<DocSection>`, `<DocPage>`, `useDoc`) + bundled root-vault `dist/docs.json`. Извлечён из `@capsuletech/web-studio/docs` subpath'а.
> 3. ~~**`@capsuletech/docs`**~~ — **удалён**. Его единственная роль (bundle root `docs/` в `docs.json`) перешла к `@capsuletech/web-docs` через тот же `DocsExtractPlugin` в его `vite.config.mts`. Consumer: `import rootDocs from '@capsuletech/web-docs/docs.json'`.
>
> Причина: viewer-runtime генерический, не studio-specific. Держать его в studio = принуждать external-consumer'ов тащить весь web-studio ради `<DocSection>`. Дополнительно — studio дублировала `IDocsRegistry` shape; теперь типы единым потоком из `@capsuletech/docs-builder`.
>
> Phase 5 (D5 ниже — «studio composer auto-discovery») остаётся актуальной, но **владельцем composer-side wiring'а** становится не `owner-studio`, а consumer'ы (apps / web-studio info-panel) которые подключают `@capsuletech/web-docs`.

# ADR 052 — Docs as data: per-package distribution

## Контекст {#context}

### Pain 1 — Центральный сканер не масштабируется на framework users {#pain1}

`docs/_build/extract.mjs` хардкодит `DOCS_DIR = 'docs/'`. Расширить на `packages/**` и `apps/**` через `SCAN_ROOTS` массив технически просто, но это решение работает **только пока вся кодовая база — внутри capsule-монорепо**.

Внешний пользователь capsule пишет свой пакет, кладёт `.md` рядом со своим компонентом, ожидает чтоб оно автоматически работало в его Studio — он не может «дописать путь» в скрипт который сидит внутри capsule-репо. Центральный сканер ломает framework-нативность.

### Pain 2 — Doc'и асимметричны с остальной композицией {#pain2}

Capsule весь построен на per-package composition (ADR 033): пакет экспортит свои UI-примитивы / controllers / shapes → app импортит → composition. Нет «центрального реестра всех Button'ов в монорепо» — каждый пакет владеет своим.

Doc'и сейчас единственная зона где это нарушено: один большой `registry.json` собранный извне. Это создаёт владельческую неоднозначность («чьи это .md в registry?»), мешает versioning'у (registry vs код может разойтись), не даёт пакету «отгрузить свою доку вместе с кодом».

### Pain 3 — Центральный extractor смешивает роли {#pain3}

`extract.mjs` — одновременно (a) парсер `.md` → структуру, (b) walker по монорепо, (c) emitter. Эти три роли в одном скрипте мешают переиспользованию: нельзя взять только парсер для не-монорепо контекста, нельзя взять только composer для app-side merge.

## Решение {#decisions}

### D1 — Engine package: `@capsuletech/docs-builder` {#D1}

Парсер `.md` → `docs.json` chunk выносится в standalone-пакет `packages/builders/docs-builder/`. 

- **Зона:** `packages/builders/` рядом с `vite-builder`, `compliance`, `lib-builder`, `biome-config`.
- **Релиз-группа:** `cli` (fixed-versioning, тег `cli@{version}`).
- **Owner:** `owner-builders`.
- **API:** programmatic `extractDocs({ root, slugStrategy, exclude })` + thin CLI `capsule-docs build`. Без зависимости от Vite — может быть вызван из Vite-plugin, CLI, прямо из скрипта.

Reasoning: builders-зона — single home для build-time tooling. Standalone пакет (не subpath `vite-builder/docs`) — потому что движок не Vite-specific и может понадобиться вне Vite-контекста (CI scripts, внешние build-tools, тесты).

Порт логики из `docs/_build/extract.mjs` (line-based parser, zero deps) — без переписки на unified/remark. Парсер работает, не сложен, replatform — отдельное решение.

### D2 — Producer: Vite-plugin in `vite-builder` + `lib-builder` {#D2}

Сам по себе `docs-builder` — библиотека. Чтобы пакет «получил docs.json при build» — нужен producer, который дёргает `docs-builder` и кладёт результат в `dist/`.

Имплементация: новый Vite-plugin `DocsExtractPlugin` в `@capsuletech/vite-builder` (для apps) и в `@capsuletech/lib-builder` (для library packages). Plugin:

1. На `buildEnd` сканирует `<packageRoot>/**/*.md` (per exclusion-list из канона `docs-system.md §8.6`)
2. Вызывает `extractDocs(...)` из `@capsuletech/docs-builder`
3. Эмитит `dist/docs.json` рядом с обычным bundle

Auto-встроен в стандартный build pipeline. Zero-config для пакетов которые уже на `vite-builder`/`lib-builder` — что покрывает 100% capsule пакетов и большинство внешних capsule-приложений.

**Escape-hatch:** для пакетов не на Vite/lib-builder (теоретически — внешний пользователь с кастомным build-tool) — CLI команда `capsule docs build` (через `@capsuletech/cli`) делает то же из command-line.

Reasoning: симметрично с `ExportGeneratorPlugin` / `RouterPlugin` / `CompliancePlugin` (которые тоже Vite-plugins в builders-зоне). Меньше boilerplate per-package — owner не пишет npm script `build:docs`, plugin сам подключается.

### D3 — Producer subpath: `<pkg>/docs.json` {#D3}

Пакет экспортит свой `docs.json` через subpath export:

```json
{
  "name": "@capsuletech/web-ui",
  "exports": {
    ".": "./dist/index.js",
    "./docs.json": "./dist/docs.json"
  }
}
```

App / composer импортит:

```ts
import webUiDocs from '@capsuletech/web-ui/docs.json';
```

JSON imports — стандарт ESM (с `with { type: 'json' }` где требуется). Никакого custom-loader'а.

`DocsExtractPlugin` (D2) **не** трогает `package.json` автоматически — owner-<pkg> добавляет `./docs.json` в `exports` руками при первом подключении. Это решение per-package: пакет может не хотеть публиковать доку (private utility) — exports не обязателен.

### D4 — Composer: auto-discovery через capsule.ts (ADR 033 pattern) {#D4}

`@capsuletech/web-docs` — composer. Меняется КАК он наполняется, контракт `IDocsRegistry` сохраняется.

Producer-side (в пакете): `capsule.ts` пакета (тот же что используется для UI/controllers registration per ADR 033) экспортит docs-registration:

```ts
// packages/web/kit/ui/src/capsule.ts
export default {
  components: { ui: { Button, Input, /* ... */ } },
  controllers: { /* ... */ },
  docs: () => import('@capsuletech/web-ui/docs.json'),  // ← НОВОЕ
};
```

Composer-side (в app): тот же auto-import что регистрирует UI/controllers, регистрирует и docs. App автоматически получает registry из пакетов которые импортит — без `Docs.register()` boilerplate'а в `capsule.ts` app'а.

Lazy import (`() => import(...)`) — docs не блокируют initial bundle. Composer ленится резолвить пока кто-то не запросит `<DocSection>` / `useDoc()`.

**Fallback (manual registration):** для пакетов без `capsule.ts` — `Docs.register(packageDocs)` остаётся как escape-hatch. Не основной путь.

Reasoning: симметрично с UI/controllers, app не пишет boilerplate. Lazy — для bundle-size.

### D5 — Root `docs/` → `@capsuletech/docs` package {#D5}

> [!warning] Superseded by Phase 3.6 (2026-06-17)
> Ниже — **исторический контекст** изначального Phase 3 решения. Wrapper-пакет `@capsuletech/docs` удалён; root `docs/` vault теперь бандлится самим `@capsuletech/web-docs` (viewer). См. amendment-блок в начале ADR.

Корневой `docs/` (ADR, architecture, _meta) становится отдельным пакетом `@capsuletech/docs` (один большой пакет — не разбиваем на `docs-architecture`/`docs-meta` на этой фазе).

- **Расположение:** `packages/docs/` (выходит за `packages/web/*`, потому что не web-specific — это сами знания о проекте).
- **Build:** тот же `DocsExtractPlugin` (через `lib-builder`) — эмитит `dist/docs.json` со slug'ами `architecture/adr/...` / `_meta/...` (per канон `docs-system.md §5.1`).
- **Slug-coexistence:** root-пакет даёт slug'и без префикса (`architecture/adr/048-docs-as-data`); per-package — с префиксом (`web-ui/button`). Коллизий нет потому что pkg-short и root-namespace не пересекаются.

Спец-случая «корневая `docs/` обрабатывается иначе» нет. После этого `docs/_build/extract.mjs` удаляется.

Reasoning: один пакет — потому что разбиение `docs-architecture` / `docs-meta` сейчас не даёт ничего (нет independent consumer'ов разных частей). Если станет неудобно — split отдельным ADR.

### D6 — Cross-package wikilink check: separate CI job {#D6}

Per-package build резолвит только локальные wikilinks. Cross-package — отдельная CI job на корневом скрипте.

- **Скрипт:** `scripts/docs-check-graph.mjs` (вне любого пакета).
- **Логика:** ждёт что все пакеты сбилдены → импортит все `dist/docs.json` → мерджит → резолвит wikilink-граф → error на упавшие.
- **CI:** job `docs-check-graph` (отдельная от `compliance:check` / `lint` / `typecheck`).
- **Команда:** `pnpm docs:check-graph` локально.

**НЕ** внутри `@capsuletech/docs` build — иначе пакет docs начинает зависеть от существования других пакетов, что нарушает зону (docs-пакет должен билдиться независимо).

**Внешний пользователь:** опционально через `capsule docs check` (CLI обёртка над тем же скриптом, конфигурируется через capsule.config.ts). Не обязательно — внешний projects могут не хотеть cross-package валидации.

Reasoning: разделение «build пакета» vs «whole-graph integrity» — стандартное (compliance тоже отдельная job, не часть build'а). Гарантирует что капсула не накапливает linkrot, но не цепляет внешних пользователей в обязаловку.

## Что НЕ решает ADR 052 (вне scope) {#non-goals}

- **Канон section-ID / frontmatter / audience / slug** — это `docs-system.md §1–§7`. Этот ADR не трогает.
- **MDX, live demos, search, JSDoc → registry** — отложено (ADR 048 non-goals).
- **Versioning docs per package version** — package-level `docs.json` идёт с версией пакета автоматически (lock-step с кодом), но «как Studio показывает несколько версий одной доки» — отдельный feature.
- **Внешние не-Vite пакеты** — поддерживаются escape-hatch'ем (CLI `capsule docs build`), но не оптимизированы. Если станет частым use-case — отдельный ADR про универсальный producer.
- **Dynamic / lazy doc-loading на runtime** (за пределами initial bundle split через lazy-import) — отдельный feature если понадобится.

## Последствия {#consequences}

**+** Doc'и симметричны с остальной композицией capsule (ADR 033). Framework users получают одинаковую модель для UI/controllers/docs.
**+** Внешний пользователь пишет `.md` рядом с компонентом → автоматически работает в его Studio. Никакой настройки центрального сканера.
**+** Versioning: `docs.json` пакета лок-степ с версией пакета. Drift невозможен.
**+** Owner-разделение: owner-builders владеет движком + Vite-plugin; owner-<pkg> владеет своими `.md`; owner-studio владеет composer'ом. Чёткие границы.
**+** Engine reusable вне монорепо — внешние tools / CI scripts могут импортить `@capsuletech/docs-builder` без зависимости от capsule build pipeline.

**−** Больше движущихся частей: новый пакет `@capsuletech/docs-builder`, новый пакет `@capsuletech/docs`, новый Vite-plugin, изменение `web-studio/docs` composer'а. Phase 1–5 деливери.
**−** Per-package `docs.json` нужно добавить в `exports` руками — нет zero-config поверх zero-config. Trade-off в обмен на opt-in (private пакет может не хотеть публиковать доку).
**−** Cross-package wikilink check работает только в монорепо capsule (или в проекте где есть `pnpm docs:check-graph`-эквивалент). Внешний пользователь может пропустить это — его decision.
**−** `docs/.generated/registry.{ts,json}` как единый файл уходит — заменяется на множество `<pkg>/dist/docs.json`. Tooling что читал старый registry (если таковое есть вне `web-studio`) нужно обновить — но в монорепо такого consumer'а нет, только `web-studio/docs`.

## Roll-out {#rollout}

Per бриф §Деливери:

- **Phase 1 — design PR (no code), owner-builders.** Обновить `docs-system.md` §8 финальной формой producer/composer контрактов.
- **Phase 2 — impl PR (engine), owner-builders.** Создать `@capsuletech/docs-builder` (порт `extract.mjs` логики).
- **Phase 3 — impl PR (root docs as package), owner-builders + главный.** Создать `@capsuletech/docs`, перевести `pnpm docs:build` на новый flow, удалить `docs/_build/extract.mjs`.
- **Phase 4 — impl PR (first colocated), owner-web-ui.** Подключить producer plugin к `@capsuletech/web-ui`, добавить один colocated README (Button) как canonical example.
- **Phase 5 — followup, owner-studio.** Обновить `web-studio/docs` composer на auto-discovery (D4).
- **Phase 6 — rollout.** Остальные owner-<pkg> подключают по своему графику.

## Альтернативы (rejected) {#alternatives}

- **Configurable scan roots в центральном `extract.mjs`** — первая версия брифа. Отвергнуто: решает только монорепо-internal use-case, не масштабируется на framework users (Pain 1).
- **Manual `Docs.register()` в app `capsule.ts`** — простая версия D4. Отвергнуто как основной путь: создаёт boilerplate в каждой app'е, асимметрично с UI/controllers auto-discovery. Остаётся escape-hatch для пакетов без capsule.ts.
- **Engine как subpath `@capsuletech/vite-builder/docs`** — компактно, но цепляет движок за Vite API. Отвергнуто: движок должен быть переиспользуем вне Vite-контекста (CLI, тесты, внешние tools).
- **Movie engine в `@capsuletech/cli`** — CLI bin `capsule docs build` остался бы хостом. Отвергнуто: смешивает «универсальный CLI» и «build infrastructure» — это разные зоны.
- **Разбить `@capsuletech/docs` на `docs-architecture`/`docs-meta`** — мелкое разбиение без независимых consumer'ов сейчас. Отвергнуто: split отдельным ADR если станет неудобно.
- **Cross-package wikilink resolve внутри `@capsuletech/docs` build** — заставляет docs-пакет знать про другие пакеты. Отвергнуто: нарушает зону.

## Open questions {#open-questions}

- **JSON imports compatibility.** ESM JSON imports требуют `with { type: 'json' }` в чистом ESM-режиме (Node 22+, Vite — нативно). Capsule везде Vite/ESM — должно работать. Если потребуется compat-shim — добавляется в `docs-builder` (helper-функция вокруг `import.meta.glob` или fetch dist/docs.json).
- **Where do app-level docs go.** Apps (`apps/playground`) могут иметь README. По D5-модели — app становится мини-пакетом с `dist/docs.json`. Но apps не публикуются. Решение: app тоже эмитит `dist/docs.json` при `vite-builder` build, composer на dev-server'е читает локально. Не публикуется.
- **Watch-mode performance.** При `vite dev` plugin может re-extract на каждое сохранение `.md`. Если медленно — debouncing внутри plugin'а (стандартный приём).
- **Per-package wikilinks с явным `pkg/`-prefix.** Может пользователь линковать `[[web-ui/button]]` из `@capsuletech/docs`? Да — D6 (cross-package check) валидирует. На per-package build это external link, save as-is.
- **Migration существующих `{#id}` anchors.** Per ADR 048 D6 — alias-period для renamed sections. После rename `extract.mjs` → `docs-builder` — `legacy-aliases.json` переезжает в `@capsuletech/docs` package (если был использован). На сейчас он пустой — non-issue.

## Связанное {#related}

- [[048-docs-as-data|ADR 048]] — обоснование. D1–D3, D6, D7 — canon. D4, D5 — заменены этим ADR.
- [[033-package-registration|ADR 033]] — registration pattern, переиспользуется в D4.
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D5 — colocation rule.
- [[../../_meta/briefs/owner-builders-docs-colocation|brief — per-package distribution]] — execution plan.
- [[../../_meta/docs-system|docs-system canon]] — section-ID / frontmatter / audience / slug / shape (без изменений).
- `packages/builders/docs-builder/` — pending имплементация (Phase 2).
- `packages/docs/` — pending создания (Phase 3).
