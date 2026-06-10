---
name: "@capsuletech/web-creator"
owner-agent: owner-web-creator
group: web_base (планируется; пока standalone git-tag)
status: SKELETON (0.0.0)
last-updated: 2026-06-09
---

# @capsuletech/web-creator

Единый design-time пакет capsule — редакторы + общие тулзы через subpaths. **Поглощает `@capsuletech/web-ui-creator`.**

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
