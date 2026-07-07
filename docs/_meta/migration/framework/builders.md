# Аудит: builders zone (vite / compliance / lib / biome / docs-builder)

- **Путь:** `packages/builders/*`
- **Release group:** `cli` (fixed) — vite-builder + compliance + lib-builder + shared-file-manager (+ cli). biome-config = отдельно (config-only).
- **Аудит:** 2026-07-07

Зона build-time. Дёргается CLI (`createDevCapsuleServer`/`buildCapsuleApp`). Порядок ADR 077: **builders вторыми после core** — без них апп не собирается, и **compliance несёт канон-enforcement (v2 canon-first критичен)**.

---

## @capsuletech/vite-builder (0.1.1) — 🟡 FIX-BEFORE-MIGRATE

Vite-конфиг + 9 плагинов + unified codegen (`CapsuleRegistryPlugin`). Зрелый, хорошо задокументирован (OWNERSHIP — образцовый), тесты на codegen/HMR/contract/loadAppConfig.

**Хорошо:** множество vendor-interop квирков (babel CJS, esbuild external, jiti Vite-time globals stubs, solid-refresh entity-exclude) — **все аннотированы с корнем**, не молчаливые. SSOT для WRAPPER_NAMES/слоёв в одном `constants.ts`. Мёртвый код Ф3 уже вычищен.

**Долги (по POLICY «костыли не тащим as-is»):**

| # | Находка | Действие |
|---|---|---|
| V1 | **`AppSourceServePlugin` — самопомеченный KNOWN TEMPORARY WORKAROUND (Variant A).** Middleware rewrite'ит `/src/*` → `/@fs/<appRoot>/src/*`, потому что Vite root = `.capsule/`. Removal condition в самом OWNERSHIP: «landing Variant B ADR (Vite root = appRoot)». | **v2-развилка:** реализовать Variant B при переносе (Vite root=appRoot → middleware исчезает), либо осознанно перенести с ADR-обоснованием. Это единственный явный «костыль с вопросом» в ядре сборки — идеальный кандидат закрыть в чистой земле. |
| V2 | **Мёртвый код** — `html.ts`, `generateFromTemplates.ts` (roadmap low, ещё не удалён). | не переносить; удалить до/при копировании. |
| V3 | **Тест-пробел (priority HIGH в roadmap):** AutoImport-генерация + plugins ordering smoke **не покрыты**. Codegen покрыт, но порядок плагинов и inject глобалов — нет. | добавить тесты ДО переноса (эталон-гейт = тесты). |
| V4 | **Remote-codegen inline-types workaround** — `CapsuleRemotes` augmentation обязан быть полностью инлайн (без `import`), т.к. app-tsconfig `moduleDetection: force` ломает `declare module` с cross-module ссылками. | не костыль (vendor-TS-лимит), но хрупко. Задокументировать как v2-known-constraint; проверить, живо ли ограничение на новых версиях TS/Vite. |
| V5 | CompliancePlugin в режиме `warn` (см. compliance ниже). | v2: поднять до `error` — canon-first. |

**Вердикт:** ядро-логику переносим, но vite-builder не эталон, пока не закрыт V1 (Variant B) + V3 (тесты). V1 — архитектурная развилка, **флажок user'у**.

---

## @capsuletech/compliance (0.1.1) — 🟡 FIX-BEFORE-MIGRATE (canon-enforcement gaps, HIGH prio для v2)

AST-линтер HCA-правил (babel parse+traverse, 9 видов violations). **Хребет canon-first** — в v2 канон должен ENFORCE'иться линтером ДО app-кода ([[feedback_canon_first_before_code]]). Поэтому его дыры = высокий приоритет.

| # | Находка | Действие |
|---|---|---|
| C1 | **`zones.ts` кодирует ОТМЕНЁННЫЙ `@capsuletech/web-workspace`** — в `PACKAGE_TO_ZONE`, `WORKSPACE_DIR_RENAME {kit:'workspace'}`, спец-кейс `isZoneImportAllowed` (app↔app разрешает только импорт web-workspace). Пакет user отменил ([[feedback_product_wide_kit_layering]] — единый UX через web-ui, не семейный пакет); dir `workspace/kit` не существует. **Мёртвый/aspirational canon в линтере** — хвост из чекпойнтов. | упростить workspace-зону до чистого app⊥app; выкинуть web-workspace refs + WORKSPACE_DIR_RENAME. **v2: пересмотреть саму `workspace`-зону** (studio/learn — это апп-хосты; их место в топологии v2 = отдельные ship-юниты `learn/`, `studio/`, а не «зона» одного монорепо). |
| C2 | **`classify.ts` НЕ знает `shapes/` и `entities/`** → файлы этих слоёв возвращают `null` → `check()` их **пропускает целиком**. Shape/Entity-слои **не линтятся** на import-нарушения. Дыра в enforcement (сам roadmap признаёт: «существующая дыра, не закрыта в Phase L»). | расширить `Layer` + `LAYER_RX` на shapes/entities + тесты. v2 canon-first — обязательно. |
| C3 | **Mode `warn`, не `error`** (structural уже валят CI, но cosmetic — upward/horizontal/native-jsx/raw-class — только warn). Roadmap: bump после L0-inventory. | v2: канон = error. Провести L0-inventory на переносимом коде, поднять режим. |
| C4 | `side-effect-fetch` не ловит member-expr (`axios.get`) — known limitation. | закрыть или зафиксировать явно. |
| C5 | JSDoc `*/` внутри комментов ломает oxc (Vite 8) — vendor-квирк, обход «пиши `Views, Controllers etc.`». | vendor-лимит, задокументировать. |

**Вердикт:** движок хороший и тестированный, но **canon-покрытие неполное** (shapes/entities не линтятся, warn-mode, dead zones.ts). Для v2, где линтер = страж канона, это надо закрыть ДО или в момент переноса. HIGH.

---

## @capsuletech/lib-builder (0.1.1) — 🟢 READY

Zero-deps leaf: `libConfig()` — Vite `UserConfig`-фабрика для сборки библиотек монорепо (`external selector`, `emitDistPackageJsonPlugin`, `cleanRootPkgForDist`). Характеризационные тесты (S-3 регрессия). Чистый лист без зависимостей.
**Фиксы:** только бренд-rename (CC-1). Проверить, что `NODE_EXTERNAL`-список не содержит stale-имён от переименований (OWNERSHIP vite упоминал историю stale-имён).

---

## @capsuletech/biome-config (0.0.10) — 🟢 READY

Config-only (один `biome.json`, нет src/dist/build). Стабилен. Root biome.json extends его.
**Фиксы:** бренд-rename; в v2 сверить правила с новым POLICY (напр. no-console исключения). Тривиально.

---

## @capsuletech/docs-builder (0.0.0) — 🟠 UNDER-QUESTION

Standalone doc-extraction tool (`bin.ts` CLI + `plugin.ts` Vite-plugin + parser/extract/slug/exclusions). Намеренные `console.log` (build-logs, biome-ignore'нуты).

**Вопросы:**
- **НЕТ OWNERSHIP.md** — единственный пакет в зоне без него (нарушение POLICY §5). Не задокументирован → зрелость/назначение неясны.
- 0.0.0 — скелет или рабочий? Src выглядит функциональным (полный parser/extract конвейер), но версия и отсутствие OWNERSHIP говорят о недооформленности.
- **Дублирование docs-тулинга:** `builders/docs-builder` + `web/docs` (web-docs 0.0.0) + `vite/codegen/generators/docs-sources.ts` — три docs-related артефакта. В v2 свести: что источник, что потребитель, что мёртвое.

**Действие:** решить, входит ли docs-tooling в первую волну framework-переноса или откладывается (docs-сайт = не критический путь). Если переносим — сначала OWNERSHIP + маturity-ревью. **Кандидат отложить** (не блокирует апп-сборку).

---

## Итог по зоне

| Пакет | Вердикт | Блокеры переноса |
|---|---|---|
| vite-builder | 🟡 | AppSourceServe (Variant B развилка) + тест-пробел AutoImport/ordering |
| compliance | 🟡 | canon-дыры: shapes/entities не линтятся, warn-mode, dead web-workspace в zones.ts |
| lib-builder | 🟢 | — (бренд-rename) |
| biome-config | 🟢 | — (бренд-rename) |
| docs-builder | 🟠 | нет OWNERSHIP, 0.0.0, docs-тулинг дублируется — решить включение в волну |

**Флажки user'у:** (1) **Variant B** (Vite root=appRoot) — закрываем ли явный workaround в чистой земле? (2) **compliance→error + shapes/entities enforcement** — поднимаем ли канон до полного enforcement до переноса app-кода? (3) **workspace-зона** — studio/learn в v2 = отдельные ship-юниты, не «зона»; zones.ts под это переосмыслить.

---

## Второй проход — code-verified (2026-07-07)

**C2 (classify.ts) — ПОДТВЕРЖДЕНО кодом.** `LAYER_RX` (classify.ts:24-31) содержит РОВНО: `view / controller / feature / widget / page / system`. **`shapes/` и `entities/` отсутствуют** → файл в `apps/<app>/src/shapes|entities/` → `classify()` возвращает `null` → `check()` пропускает его для всех HCA-import-правил. `extractGroup` (для horizontal-import детекта) тоже знает только 5 множественных слоёв. **Итог: 2 из 7 HCA-слоёв (Shape, Entity) полностью вне линтера** — upward/horizontal/disallowed в них не ловятся. Для v2 canon-first (линтер = страж канона ДО app-кода) это должно быть закрыто в первую очередь: расширить `Layer`+`LAYER_RX`+`extractGroup`+`LAYER_TO_NAMESPACE` (SSOT в vite constants.ts) на shapes/entities + тесты.

**V1 (AppSourceServePlugin) — ПОДТВЕРЖДЕНО кодом.** ~40 строк, одна `configureServer` middleware (appSourceServe.ts:65-77). Корень явно задокументирован: `capsuleConfig` ставит Vite `root = <appRoot>/.capsule/` → `/src/*` резолвится в несуществующий `.capsule/src/*` → rewrite в `/@fs/<appRoot>/src/*`. Тонкость Connect mount-path (почему НЕ `use('/src', fn)`) задокументирована. Removal-condition явный: **Variant B — Vite `root` = `<appRoot>`, `.capsule/` = обычный codegen-output**. Оценка: workaround **изолированный и понятный** (одна middleware), но root-fix (Variant B) **архитектурный** — влияет на весь codegen-pipeline (все генераторы пишут в `.capsule/`, scaffold читает `../src/`, entry-импорты). Бблокированный, но не тривиальный рефактор. Идеальный кандидат закрыть в чистой земле v2 отдельным ADR (не нести middleware).
