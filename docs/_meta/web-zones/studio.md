---
title: web-zone-studio
description: Canon для zone `studio` — host/composer пакет для авторства capsule-приложений (редактор, palette, inspector, generators, docs consumer). Source of truth о scope, import-правилах, vendor-stack.
status: canon
last_updated: 2026-06-12
---

# Zone: studio

> Физическая директория: `packages/web/studio/` (5-я top-level zone после ADR 047 D6 retired предыдущую `design-time` зону).
>
> Канон-источники: [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1 + D4 + **D6** (zone flatten — `design-time/studio` → `studio`), [[045-web-taxonomy|ADR 045]] #2, [[048-docs-as-data|ADR 048]] (studio/docs consumer).
>
> **Composition rule (canon):** studio exports product-blocks (`logic-editor`, `component-builder`, …), НЕ raw functionality. Universal engines (generators, manifest registry, JSON-tree ops) при необходимости живут отдельными пакетами и юзаются и в studio, и в apps. См. memory `feedback_studio_composition_rule`.

## Purpose {#purpose}

**Host/composer для авторства capsule-приложений: единый интерфейс для UI-construction, FSM-визуализации, docs-навигации, monitoring, build.** Это **не runtime** — studio-пакет грузится только при работе в editor-mode (через `<EditorRoot>` или dedicated studio-app), не попадает в production-bundle target-app'а.

Studio обязан удовлетворять трём инвариантам:

1. **Not in app prod-bundle.** Если import studio попал в prod-build target-app'а → costly bug. Studio существует за editor-shell'ом, который маунтится опционально (dev-mode / studio-app).
2. **Reads-всё-кроме-apps.** Studio может анализировать структуру kit/runtime/boost/domain/contract'ов (inspector для props, palette из manifest'ов). Не зависит на конкретный app.
3. **Composes existing packages.** Studio пишет минимум сама — основной функционал собирается из reusable пакетов (kit/runtime/boost/domain). Universal engines живут в своих пакетах, не embedded в studio.

## Packages {#packages}

| Package | npm | Status | One-line |
|---|---|---|---|
| `studio` | `@capsuletech/studio` | alpha (0.1.1) | Sole inhabitant. Host/composer для авторства: editor + palette + inspector + canvas + monitor + catalog + docs + generators. Multi-entry subpaths. |

> **Zone is single-package by design.** Studio = host, не зоопарк. Новые features = новые subpaths внутри studio, новые reusable блоки = пакеты в других зонах (kit/runtime/boost/domain).

### Subpath canon (целевое состояние после rework)

**Public surface = product-blocks (assembled solutions):**

- `/component-builder` — UI editor (структурный + procedural generator) — assembled product.
- `/logic-editor` — logic editor (FSM-визуализация) — assembled product (использует boost-flow + state-ops).
- `/style-editor` — style editor.
- `/text-editor` — text/i18n editor.
- `/app-editor` — app-level editor (роутинг, providers).
- `/inspector-panel` — generic-inspector пропсов как готовая панель.
- `/canvas` — редактор-канвас (inline + iframe+WS).
- `/monitor` — runtime/build/test monitor panel.
- `/catalog` — catalog (Storybook sunset target).
- `/docs` — `<DocSection slug="..."/>` consumer per [[048-docs-as-data|ADR 048]].
- `/shell` — chrome редактора (не путать с `web-shell`).

**Текущий internal layout (quick-and-dirty, audit-target):**

- `/manifests` — реестр спецификаций компонентов. **AUDIT:** дублирует kit manifests → consolidate в `@capsuletech/web-ui`.
- `/state` — JSON-tree ops. **AUDIT:** TBD — extract в свой пакет (reusable) или product-block.
- `/inspector` — generic UI-form. **AUDIT:** разнести — raw inspector engine в свой пакет, product-blocks (`/inspector-panel`) в studio.
- `/generators` — procedural UI generators. **AUDIT:** universal engine → extract в свой пакет, studio consumes.
- `/controllers` — `EditorController` + `EditorOverlay` — studio-specific HCA-adapter (остаётся в studio, правильно).
- `/capsule` — registration entry (ADR 033) — studio-specific (остаётся).

## Import rules {#import-rules}

```
studio → kit (можно)
studio → runtime (можно)
studio → boost (можно — preview canvas с реальными boost'ами; boost-flow для logic-editor)
studio → domain (можно — preview chrome)
studio → web-contract (можно — introspect'а capability)
studio ↛ studio (нет — это один пакет)
apps ↛ studio в prod (вне editor-shell) — must be tree-shaken / lazy-loaded
```

**Apps consume studio ТОЛЬКО через editor-shell** (`<EditorRoot>`). Если app-код напрямую импортит из `@capsuletech/studio/inspector` — компилятор/lint должен это ловить (опц. build-time check).

## Canonical shape {#canonical-shape}

```
packages/web/studio/
  src/
    component-builder/  ← UI editor product-block
    logic-editor/       ← FSM editor product-block (uses boost-flow)
    style-editor/       ← style editor product-block
    text-editor/        ← text editor product-block
    app-editor/         ← app-level editor product-block
    inspector-panel/    ← inspector as panel product-block
    canvas/             ← canvas (inline/iframe-WS)
    monitor/            ← runtime/build/test panels
    catalog/            ← Storybook-equivalent
    docs/               ← DocSection consumer (ADR 048)
    shell/              ← editor chrome (toolbar, panels layout)
    controllers/        ← HCA-adapter (EditorController + Overlay)
    capsule.ts          ← registration entry
  package.json          ← multi-entry exports per subpath
  OWNERSHIP.md
  README.md
```

Признаки канона:

- **Multi-entry build** — каждый subpath независимо tree-shakeable.
- **Composition-first.** Subpaths собраны из reusable пакетов; внутри studio только тонкая обвязка.
- **Manifests-driven** — `/inspector-panel`, `/component-builder` читают manifest из kit, не hardcoded списки.
- **Canvas isolated** — inline для simple-режима, iframe+WebSocket для full-isolation с реальным runtime'ом target-app'а.
- **Docs consumer** — `<DocSection slug="adr/047#D6"/>` читает `docs/.generated/registry.ts` (ADR 048).

## Vendor stack {#vendor-stack}

Главные вендоры:

- **Solid.js** — реактивный фреймворк.
- **`@kobalte/core`** — chrome редактора (Dialog/Popover/Menu для UI).
- **`@corvu/resizable`** — resize panels.
- **CodeMirror / Monaco** (TBD) — code editor для `/logic-editor` + `/style-editor` + `/text-editor`.
- **`@capsuletech/web-renderer`** — рендер preview по JSON-схеме внутри canvas'а.
- **`@capsuletech/boost-flow`** — граф-рендер для `/logic-editor`.

Документация upstream — в OWNERSHIP.md (vendor stack section).

## Non-goals {#non-goals}

Studio **не делает**:

- ❌ Появляется в production-bundle app'а. Если оказался — bug.
- ❌ Свой UI-kit. Editor chrome рисуется на `@capsuletech/web-ui` (kit). Пользовательский kit инжектится только в канвас.
- ❌ Свой runtime. Inspector / palette / monitor читают runtime'ы (web-state, web-router и т.п.), не реализуют свои.
- ❌ Domain-логику. Editor — инструмент, не feature-vertical.
- ❌ Сборку финального app'а. Build — `@capsuletech/cli` + `@capsuletech/vite-builder`. Studio может **запускать** build (через `/monitor`), не реализует.
- ❌ Свой docs-сорсинг. Single source markdown в `docs/`, studio только consume через `/docs` per ADR 048.
- ❌ Hosting raw-engines как public surface. Universal engines (generators, manifest registry) extract'ятся в свои пакеты.

## New subpath — checklist {#new-subpath-checklist}

Добавление subpath'а в studio (это норм; новый пакет в zone — **не норм**):

1. Открыть дискуссию с главным assistant'ом — это правда новый concern, или расширение существующего product-block'а?
2. Это **product-block** (subpath name = use-case/product, например `logic-editor`)? Если raw-engine — extract в свой пакет, studio consume.
3. Если новый subpath одобрен:
   - Добавить entry в `package.json` exports field.
   - Добавить subpath в multi-entry build config.
   - Документ subpath в `docs/_meta/studio.md` AI-anchor.
   - Tests + bundle-size assertion (subpath изолирован, tree-shake works).
4. ADR не нужен (расширение в рамках zone-канона).

## Related {#related}

- [[web-zone-kit]], [[web-zone-runtime]], [[web-zone-boost]], [[web-zone-domain]] — studio может читать любую из этих zone.
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D4 + D6 — studio rename + absorb + zone flatten.
- [[045-web-taxonomy|ADR 045]] #2 — creator absorb ui-creator (renamed studio per ADR 047).
- [[048-docs-as-data|ADR 048]] — docs-as-data infra + studio/docs consumer.
