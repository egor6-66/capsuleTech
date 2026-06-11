---
name: "@capsuletech/web-creator"
owner-agent: owner-web-creator
group: web_base
zone: design-time
status: scaffold
priority: P1
last-updated: 2026-06-11
---

# @capsuletech/web-creator

Единый design-time пакет capsule — редакторы + общие тулзы через subpaths. **Поглощает `@capsuletech/web-ui-creator`** (ADR 045 #2). Будет переименован в `@capsuletech/studio` per [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D4 (Phase D4 plan-doc).

## Состояние (читать ПЕРВЫМ)

- **Zone:** `design-time` — tooling для создания capsule-apps; не runtime, не в prod-bundle apps'ов.
- **Status:** `scaffold` (0.0.0) — структура задана, реализация по founding F2-F4 plan'у ниже.
- **Priority:** **P1** — критичный для studio-experience, но capsule-апп без него работает.
- **Maturity bar (до alpha):**
  - F2 `/catalog` готов (demo-стенд через контракты web-contract).
  - F3 структурный UI editor (palette+tree+canvas).
  - F4 procedural UI generator (seeded).
  - Rename → `@capsuletech/studio` (Phase D4).
  - Absorb `ui-creator` subpath'ы (`/manifests`, `/state`, `/inspector`, `/generators`).
- **Active blockers:** ждёт стабилизацию Phase B+C (зона D начинается после).
- **Roadmap (3-5):**
  1. F2 catalog (demo-стенд + первый потребитель web-contract).
  2. F3 UI editor (palette+tree+canvas).
  3. F4 procedural generator.
  4. Phase D4 rename + absorb (после B+C).
  5. Studio palette badge — реальные sizeKB per primitive из web-ui manifest (после W4).
- **Last activity:** 2026-06-11 (canon refresh).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@capsuletech/web-ui`** (workspace, dep) — chrome редактора (хард-деп). См. [[web-zone-design-time]]: design-time использует kit для chrome, юзерский kit инжектится только в канвас.
- **`@capsuletech/web-renderer`** (workspace, dep) — рендер preview по JSON-схеме внутри канваса.
- **`@capsuletech/web-contract`** (workspace, dep) — leaf-протоколы; creator collect'ит контракты компонентов.
- **`@capsuletech/web-style`** (workspace, dep) — tokens + createStyle.
- _(TBD)_ code editor — CodeMirror или Monaco для `/logic` + `/style` + `/text` (Phase D4 решение).
- _(TBD)_ canvas isolation transport — WebSocket или MessageChannel для iframe-mode канваса.

## Subpath-структура (целевая)

- **Тулзы:** `/shell` (панели+mode-switch) · `/palette` · `/tree` · `/inspector` (+color/slider/swatch) · `/canvas` (+overlays) · `/data` (JSON→diff→коэрция) · `/monitor` · `/catalog` (demo-стенд/тест-среда).
- **Редакторы:** `/style` · `/ui` · `/text` · `/logic` · `/app`.

## Ментальная модель (НЕ нарушать)

- Хром редактора — на нашем **web-ui** (хард-деп). Юзерский «кит» инжектится **только в канвас** (сломанный юзер-компонент не ломает хром).
- Контракт лежит В компоненте (web-ui/table/...). creator ПОТРЕБЛЯЕТ через `collectContracts` из `web-contract` (leaf).
- Все редакторы выдают **per-tenant JSON** (`theme/copy/tree/fsm.json`).

## Деп-граф (без циклов)

`web-style ← web-ui ← web-creator`. `web-contract` (leaf) импортят и web-ui (декларация), и web-creator (потребление). editor-UI НЕ кладём в web-style/editor (был бы цикл) — редактор стилей живёт в `web-creator/style`.

## Founding task (миграция + фундамент, F2–F4)

1. **F2** `catalog` — demo-стенд, первый потребитель контрактов, тест-среда (ПЕРЕД ui-редактором).
2. **F3** перенести из `web-ui-creator`: `state/`→`/tree`, `inspector/`→`/inspector`, canvas/overlays→`/canvas`, manifests-потребление→через `web-contract`. **Рискованный кросс-пакетный рефактор → topic-ветка.**
3. **F4** редакторы худеют до ассемблеров (контракты + тулзы).

**Cross-package (через главного):** `web-contract` (стюард главный), `web-renderer` (owner), `web-ui` (owner), `web-style` runtime (owner). `web-ui-creator` депрекейтится после миграции.

## Канвас

inline (same-doc, scoped data-theme) ИЛИ iframe+WS (живой апп, пуш конфига). v1 style-editor = iframe+WS. Один код-путь.

## Документация

- План: `docs/playground/` (creator.md, roadmap.md F2–F4, architecture.md, contracts.md)
