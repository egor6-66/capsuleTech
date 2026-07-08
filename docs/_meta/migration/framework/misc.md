# Аудит: canvas / desktop / web-docs (низкий приоритет)

- **Аудит:** 2026-07-07

Периферия фреймворка — скелеты и опциональные capability-пакеты. Не критический путь апп-сборки.

## canvas namespace (host / three / ui) — 🟠 UNDER-QUESTION (скелеты, defer)

- **canvas-host** (0.0.0, src=4 test=0) — контракт `ICanvasEngineAdapter` + lifecycle FSM + bridge-protocol. Contract-only scaffold, 0 тестов.
- **canvas-three** (0.0.0, src=1 test=0) — Three.js adapter, **1 файл**, 0 тестов (agent-desc зовёт «эталон», по факту голый scaffold).
- **canvas-ui** (0.0.0, src=1 test=0) — overlays, 1 файл, 0 тестов.

**Контекст:** canvas-host = embed-контракт для 3D-движков (Three.js / Babylon / **Unity WebGL — ADR 075 метавселенная/языковой ролеплей**). Реализация «после ревью контракта» (agent-desc). Привязан к Unity-волне (turn-based ролеплей, STT-пререквизит — ADR 065 ф.3).
**Действие:** **не в первой волне framework.** Contract (canvas-host) можно портировать как type-фундамент, но адаптеры (three/ui) = голые скелеты → строить свежим в v2, когда canvas/Unity-трек активируется. Defer.

## @capsuletech/desktop (0.0.0, pre-1.0) — 🟡/🟠 (функциональный, но тяжёлый + опциональный)

Tauri-shell host: JS wrapper (`runDev`/`runBuild`, child-process orchestration, override scaffolding) + **Rust crate** (`native/` — standalone Cargo, Tauri shell, tauri.conf, capabilities, icons) + build pipeline. **PR 3/8 done — API готов и покрыт (src=6 test=4).** Дёргается CLI `capsule desktop dev|build`. Group `cli`.

**Вопросы:**
- 0.0.0 + Phase-incomplete: system-metrics host-мониторинг (ADR 023 Phase A) — WIP ([[project_desktop_system_metrics]]).
- **Rust crate = extra migration weight** — cargo toolchain, platform-dependent бинарь (`dist/bin/capsule-desktop[.exe]`), не workspace-member backend/. Перенос тянет Rust-сборку.
- Опциональная capability — не каждый апп desktop'ит. CLI desktop-команда завязана (CLI5).
**Действие:** функционально готов (runDev/runBuild + тесты), но **v2-развилка: desktop в первую волну framework или отдельным capability-треком?** Учитывая Rust-вес + опциональность — кандидат вынести в отдельный ship-юнit / отложить. Если переносим — cargo-pipeline + бинарь-эмит проверить в новой земле.

## @capsuletech/web-docs (0.0.0, alpha) — 🟠 (docs-тулинг-трио, consolidate)

Docs-сайт компоненты (DocSection/DocPage). `dangerouslySetInnerHTML` для controlled docs-source — biome-ignore'нут с обоснованием («docs source is controlled»). src=8 test=6.

**Проблема (CC):** docs-тулинг размазан на **три** артефакта — `web/docs` (рендер) + `builders/docs-builder` (extraction CLI+plugin, 0.0.0, БЕЗ OWNERSHIP) + `vite/plugins/codegen/generators/docs-sources.ts` (кодген источников). В v2 свести: источник / потребитель / мёртвое.

**🚩 Canon-conflict (2026-07-07, найдено при v2 канон-бутстрапе commons):** `render-markdown.ts` (web-docs) парсит **Obsidian-специфичный** синтаксис — wikilinks `[[id]]`/`[[id|label]]` и callouts `> [!type]` (ADR 048 D2-D3, `docs-system.md` §4, брифы `docs-markdown-callouts-wikilinks.md`/`ui-prose-callouts-wikilink.md`). Prose (`web-ui`) несёт парные `.wikilink`/`.callout-*` стили. Это прямо конфликтует с решением v2: **ноль Obsidian, только чистый markdown** (`commons/standards/workflow/docs-hygiene.md` правила 7-8). Ценность (slug-индирекция + build-time link-граф-валидация) — реальна и стоит перенести, но она свойство **их собственного parser/registry**, не свойство `[[...]]`-синтаксиса — тот же parser одинаково валидирует обычные markdown-ссылки `[text](slug)`. Разбор — см. переписку по ADR-077, чек-лист верификации §1.
**Действие:** **не критический путь** (docs-сайт ≠ апп-сборка). Отложить из первой волны; при переносе — (1) консолидировать docs-тулинг-трио + завести OWNERSHIP для docs-builder, (2) **пересобрать резолвер под стандартный markdown-синтаксис** (`[text](path)` вместо wikilinks; callout-blockquote — решить отдельно, не копировать Obsidian-taxonomy автоматом). Не переносить `[[...]]`-парсинг as-is.

## Pass-2 (2026-07-08) — web-docs tie-in к v2-продукту

`web-docs` `render-markdown.ts` (Obsidian wikilinks/callouts) + Prose `.wikilink`/`.callout-*` —
флагнуто как canon-конфликт (capsule PR #476/#475, gap U6): v2-канон = **чистый markdown, ноль
Obsidian**. **Новый контекст (2026-07-07):** появился продукт **Omnifield Writer** (репо `writer`),
чей движок берёт `render-markdown.ts` **de-Obsidian** (порт-карта `writer/ARCHITECTURE.md`). Т.е.
web-docs НЕ переносится в framework как есть — его рендер-ядро **уезжает в writer-движок**
очищенным. docs-трио (web/docs + builders/docs-builder + vite codegen docs-sources) в framework =
кандидат на снос/consolidate, а не порт. Подтверждает pass-1 «defer + consolidate».

## Итог

| Пакет | Вердикт |
|---|---|
| canvas-host / three / ui | 🟠 — скелеты, привязка к Unity-треку (ADR 075), defer |
| desktop | 🟡/🟠 — функционален+tested, но Rust-вес + опционален (развилка: отдельный трек?) |
| web-docs | 🟠 — docs-тулинг-трио, consolidate, не критпуть, defer |

**Все три — вне первой волны framework-переноса** (core→builders→kit→cli→runtime→domain). Опциональные/периферийные capability. Переносить осознанными отдельными решениями, не автоматом.
