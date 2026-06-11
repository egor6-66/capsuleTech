---
title: web-zone-design-time
description: Canon для zone `design-time` — tooling для создания capsule-приложений (редакторы, palette, inspector, monitor, build, catalog, docs). Source of truth о scope, import-правилах, vendor-stack.
status: canon
last_updated: 2026-06-11
---

# Zone: design-time

> Физическая директория: `packages/web/design-time/` (после Phase D миграции; на момент 2026-06-11 — плоский `packages/web/{creator,ui-creator}/`, после ADR 047 D4 → `packages/web/design-time/studio/` с absorb'ом `ui-creator`).
>
> Канон-источники: [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1 + D4 (studio rename + absorb), [[045-web-taxonomy|ADR 045]] #2 (creator absorb ui-creator), [[048-docs-as-data|ADR 048]] (studio/docs consumer).

## Purpose

**Tooling для создания capsule-приложений: редакторы, palette, inspector, monitor, build, catalog, docs.** Это **не runtime** — design-time-пакеты грузятся ТОЛЬКО при работе в editor-mode (studio), не в production-bundle'е target-app'а.

Design-time-пакет обязан удовлетворять трём инвариантам:

1. **Not in app prod-bundle.** Если import design-time из app-кода попал в prod-build → это **costly bug**. Design-time существует за editor-shell'ом (`<EditorRoot>`), который сам опционально маунтится в dev-режиме (или в отдельном studio-аппе).
2. **Reads-всё-кроме-apps.** Design-time может анализировать структуру kit/runtime/boost/domain/contract'ов (рендерить inspector для props, читать manifest для palette). Не зависит на конкретный app.
3. **Subpath-разнообразие.** Один пакет `@capsuletech/studio` с subpath'ами (`/shell`, `/palette`, `/inspector`, `/canvas`, `/data`, `/monitor`, `/catalog`, `/docs`, `/style`, `/ui`, `/text`, `/logic`, `/app`) — НЕ зоопарк подобных пакетов.

## Packages

| Package | npm | Status | One-line |
|---|---|---|---|
| `studio` (бывш. `web-creator`, absorbs `web-ui-creator`) | `@capsuletech/studio` | scaffold | Единый design-time: editor + palette + inspector + canvas + monitor + catalog + docs. Subpath'ы по двум родам: тулзы + редакторы. |

> **Naming canon (post-ADR 047 D4):** `@capsuletech/web-creator` → `@capsuletech/studio`. Это не дополнительная буква, а явный signaling: «полноценный design-time», не «UI creator». Поглощает `@capsuletech/web-ui-creator` (его /manifests, /state, /inspector, /generators переезжают в subpath'ы studio).

### Subpath canon (после Phase D)

**Тулзы** — переиспользуемые блоки design-time'а:

- `/shell` — chrome редактора (не путать с `web-shell`).
- `/palette` — palette компонентов для drag-in canvas.
- `/tree` — node-tree представление.
- `/inspector` — generic-inspector пропсов (читает manifest).
- `/canvas` — редактор-канвас (inline + iframe+WS режимы).
- `/data` — интерактивный Shape для UI-редактора.
- `/monitor` — runtime/build/test monitor.
- `/catalog` — catalog (Storybook sunset target).
- `/docs` — `<DocSection slug="..."/>` consumer per [[048-docs-as-data|ADR 048]].

**Редакторы** — конкретные сценарии редактирования:

- `/style` — style editor.
- `/ui` — UI editor (структурный + procedural generator).
- `/text` — text/i18n editor.
- `/logic` — logic editor (FSM-визуализация).
- `/app` — app-level editor (роутинг, providers).

## Import rules

```
design-time → kit (можно)
design-time → runtime (можно)
design-time → boost (можно — например для preview canvas'а с реальными boost'ами)
design-time → domain (можно — для preview chrome)
design-time → web-contract (можно — для introspect'а capability)
design-time ↛ design-time (нет — это один пакет)
apps ↛ design-time в prod (вне editor-shell) — must be tree-shaken / lazy-loaded
```

**Apps consume design-time ТОЛЬКО через editor-shell** (`<EditorRoot>`). Если app-код напрямую импортит из `@capsuletech/studio/inspector` — компилятор/lint должен это ловить (опц. build-time check).

## Canonical shape

Структура studio после Phase D + absorb:

```
packages/web/design-time/studio/
  src/
    shell/          ← editor chrome (toolbar, panels layout)
    palette/        ← компоненты палитра
    tree/           ← node tree
    inspector/      ← generic prop inspector
    canvas/         ← canvas (inline/iframe-WS)
    data/           ← Shape inspector / preview
    monitor/        ← runtime/build/test panels
    catalog/        ← Storybook-equivalent
    docs/           ← DocSection consumer (ADR 048)
    style/          ← style editor
    ui/             ← UI editor
    text/           ← text editor
    logic/          ← logic editor
    app/            ← app-level editor
    manifests/      ← (absorbed from web-ui-creator) реестр спецификаций компонентов
    state/          ← (absorbed from web-ui-creator) операции над JSON-деревом
    generators/     ← (absorbed from web-ui-creator) procedural UI generators
  package.json      ← multi-entry exports per subpath
  OWNERSHIP.md
  README.md
```

Признаки канона:

- **Multi-entry build** — каждый subpath независимо tree-shakeable.
- **Manifests-driven** — `/inspector`, `/palette`, `/tree` читают manifest, не hardcoded списки. Manifests генерятся build-time из source-кода пакетов (kit/boost/domain).
- **Canvas isolated** — inline для simple-режима, iframe+WebSocket для full-isolation с реальным runtime'ом target-app'а.
- **Docs consumer** — `<DocSection slug="adr/047#D4"/>` читает `docs/.generated/registry.ts` (ADR 048).

## Vendor stack

Главные вендоры:

- **Solid.js** — реактивный фреймворк.
- **`@kobalte/core`** — chrome редактора (Dialog/Popover/Menu для UI).
- **`corvu/resizable`** — resize panels (потенциально через `boost-matrix`).
- **CodeMirror / Monaco** (TBD) — code editor для /logic + /style + /text.
- **`@capsuletech/web-renderer`** — рендер preview по JSON-схеме внутри canvas'а.

Документация upstream — per-subpath в OWNERSHIP.md.

## Non-goals

Design-time **не делает**:

- ❌ Появляется в production-bundle app'а. Если оказался — это **bug**.
- ❌ Свой UI-kit. Editor chrome рисуется на `@capsuletech/web-ui` (kit). Пользовательский kit инжектится ТОЛЬКО в канвас.
- ❌ Свой runtime. Inspector / palette / monitor читают runtime'ы (web-state, web-router и т.п.), не реализуют свои.
- ❌ Domain-логику. Editor — это **инструмент**, не feature-vertical.
- ❌ Сборку финального app'а. Build — `@capsuletech/cli` + `@capsuletech/vite-builder`. Studio может **запускать** build (через `/monitor`), но не реализует.
- ❌ Свой docs-сорсинг. Single source markdown в `docs/`, studio только consume через `/docs` per ADR 048.

## New subpath — checklist

Добавление subpath'а в studio (это норм; новый пакет в zone — **не норм**):

1. Открыть дискуссию с главным assistant'ом — это правда новый concern, не расширение существующего?
2. Если новый subpath одобрен:
   - Добавить entry в `package.json` exports field.
   - Добавить subpath в multi-entry build config.
   - Документ subpath в `docs/_meta/studio.md` (после rename'а).
   - Tests + bundle-size assertion (subpath изолирован, tree-shake works).
3. ADR не нужен (расширение в рамках zone-канона).

## Migration notes (для будущего PR'а studio rename)

Phase D1 (per plan-doc):

1. `packages/web/creator/` + `packages/web/ui-creator/` → `packages/web/design-time/studio/` (директория-rename + merge).
2. npm rename: `@capsuletech/web-creator` → `@capsuletech/studio`. `@capsuletech/web-ui-creator` deprecated (peer re-export на 1 минор для миграции consumers).
3. Subpath'ы из ui-creator (`/manifests`, `/state`, `/inspector`, `/generators`) переезжают как subpath'ы studio (не теряются).
4. `tsconfig.base.json` paths.
5. OWNERSHIP перепись + README обязательно (minimum usage).
6. Owner-агент `.claude/agents/owner-web-creator.md` → `owner-studio.md` (отдельный PR + restart).
7. Apps imports update — координация с user'ом (apps trogает framework-developer).

## Related

- [[web-creator]] (→ rename studio), [[web-ui-creator]] (→ absorbed into studio) — per-package AI-anchors.
- [[web-zone-kit]], [[web-zone-runtime]], [[web-zone-boost]], [[web-zone-domain]] — design-time может читать любую из этих zone.
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D4 — studio rename + absorb.
- [[045-web-taxonomy|ADR 045]] #2 — creator absorb ui-creator (renamed studio per ADR 047).
- [[048-docs-as-data|ADR 048]] — docs-as-data infra + studio/docs consumer.
