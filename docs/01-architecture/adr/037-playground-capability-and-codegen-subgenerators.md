---
tags: [hca, adr, accepted, codegen, playground, devtools]
status: accepted
date: 2026-06-07
---

> [!info] Status
> **Accepted (направление)** — 2026-06-07. Решение из проектной сессии (playground-эталон). Реализация по фазам через owner'ов: **packages-first** (рефактор кодгена → manifest-саб-ген → пакет витрины), коммит, затем наполнение `apps/playground` кейсами по слоям. Supersedes [[025-testing-hub|ADR 025]] (testhub — deprecated). Связано: [[033-package-registration|033]], [[032-package-controllers-and-useemit|032]], [[036-shape-redesign-and-table-package|036]].

# ADR 037 — Playground как способность фреймворка + рефактор кодгена (sub-generators) + artifact-manifest

## Контекст {#context}

1. **Нужен эталонный app + витрина.** `apps/playground` должен покрыть все кейсы каждого слоя (примитивы → композиции → Shape → логика → пакеты → флоу) по максимальному канону — одновременно: (а) референс для агентов при создании новых апп, (б) фул-тест архитектуры (smoke всего), (в) датасеты для `@capsuletech/web-ui-creator`, (г) публичная визитка с live-рендером + кодом каждого кейса.

2. **Ключевое наблюдение:** `.capsule/` — это сгенерённое **зеркало** `src/`. Кодген уже перечисляет каждый артефакт (Views/Widgets/Entities/Controllers/Features/Shapes/Pages) с путями и структурой. Это ровно тот инвентарь, который нужен витрине/smoke/devtools. → playground — **не app, а способность фреймворка**: самоинтроспектирующиеся devtools/витрина над зеркалом ЛЮБОГО app.

3. **Кодген — монолит.** `packages/builders/vite/src/plugins/capsuleRegistry.ts` ~1.5к строк: 5 фактических саб-генераторов (barrel-registry, endpoints, app-config, packages, bootstrap) + stateful-оркестрация в одном замыкании. Добавить новый вывод = править замыкание в 4 местах (state-мапа + flush + event-handler + initialScan + bootstrap-wiring) → нечитаемо, риск рассинхрона. Есть легаси (pre-ADR-034 чистка `wrappers.ts`/`slots.d.ts`).

4. **Шум в слоях недопустим для эталона.** Текущие моки (инлайн-RNG в `Entity`, `preRequest`-ветки в endpoint'ах, флаг `__CAPSULE_MOCKS__`) шумят в слоях. `src/` должен быть = только канон-артефакты.

## Решение {#decisions}

### 1. Playground = способность фреймворка (пакет + per-app инстансы)

- **Пакет витрины** (opt-in через `capsule.app.ts: packages`, [[033-package-registration|ADR 033]]) потребляет сгенерённый manifest → catalog-UI + smoke-util + code-preview + flow-viz.
- `apps/playground` = **эталонный инстанс** пакета + канон-библиотека кейсов.
- **User app** подключает пакет → **свой инстанс** витрины/devtools над своими артефактами и контекстом. Большинство наших тулзов — у юзера из коробки, тем же флоу.

### 2. Рефактор кодгена: base-оркестратор + реестр sub-generators (один рантайм-плагин)

Externally — **один** Vite-плагин (база на `packages/builders/vite/src/utils/watcher.ts`). Internally — реестр **саб-генераторов**, каждый self-contained. Добавить автоген = добавить 1 модуль + зарегистрировать; оркестратор не трогаем → ни монолита, ни рассинхрона.

Контракт (набросок, финал — owner-builders):
```ts
interface SubGenerator {
  id: string;
  match(file: string): boolean;            // какие src-пути триггерят
  onEvent?(e, file, ctx): void;            // обновляет СВОЙ стейт, метит dirty
  flush(ctx): void;                        // пишет свои выводы (diff-write)
  bootstrap?(ctx): { phase; importPath };  // вклад в порядок bootstrap
  transform?(code, id, ctx): Result | null;// опц. вклад в Vite transform
  order?: number;
}
```
База владеет: единым watch-подписом на `src/**`, `initialScan`, диспатчем event → `onEvent` нужных саб-генов → `flush` грязных по `order`, сборкой bootstrap из вкладов, цепочкой `transform`, alias-хуком, `writeOut` (diff). Чистые `generateX` переезжают в свои саб-модули (юнит-тесты сохраняются). Легаси вычищается. **RouterPlugin** — кандидат стать таким же саб-геном (один watcher на весь `src`), объём оценивает owner-builders.

### 3. Sub-generator `playground-manifest`

Эмиттит `.capsule/playground.manifest.ts`:
```ts
interface ArtifactEntry {
  id: string;            // 'widgets/forms/auth/login'
  layer: LayerName;
  global: string;        // 'Widgets.Forms.Auth.Login'
  meta: { title: string; description?: string; category: string; tags: string[] };
  introspect?: { fields?; fsmStates?; events?; shapeRow?; composes? }; // AST-derived, по слою
  load: () => Promise<{ default: Component }>;  // lazy
  source: string;        // ?raw
}
interface PlaygroundManifest { app: { name: string }; artifacts: ArtifactEntry[]; }
```
App-relative `import.meta.glob` живёт в зеркале → пакет остаётся generic.

### 4. Источники меты — src чистый, авторинг в JSDoc, эмиссия в зеркало

`src/` = только канон-артефакты. **`.meta.ts` в папках слоёв запрещён** (кодген классифицирует любой файл в папке слоя как артефакт → стал бы мусорным `Views.*`-глобалом). Мета собирается кодгеном из:
1. **JSDoc** над `export default` (`title`/описание, `@category`, `@tags`) — авторская, чистая.
2. **Путь/структура** (layer + папки = категория/группа).
3. **AST-интроспекция артефакта** (ноль авторинга): Entity→поля схемы; Controller/Feature→стейты FSM + события; Shape→row + `as`; Widget/Page→скомпонованные глобалы; View→`meta.tags`/примитивы; package-глобалы→phantom `__events`/`__tpl`.
4. **App-level** (`capsule.app.ts` + опц. `playground.config.ts` для override/порядка) — вне папок слоёв.

Зеркало = поверхность **потребления** (волатильно, регенерится); src JSDoc = поверхность **авторинга**.

### 5. Инструменты (industry-standard, не изобретаем)

- **Shiki** — подсветка кода (мультиязык, JSON) + `markdown-it` для документов. Код-вью — кандидат на отдельный пакет (`@capsuletech/web-code`), переиспользуемый вне playground.
- **Monaco/CodeMirror** — редактирование (JSON, merge-конфликты) — заложено на будущее в тот же код-вью-пакет.
- **MSW + @faker-js/faker** — мощная мок-система без мусора в слоях — **отдельный ADR** (моки вне `Entity`/endpoint, перехват на сети).

## Последствия {#consequences}

- **owner-builders:** рефактор кодгена (base + sub-generators, чистка легаси, опц. RouterPlugin) + новый саб-ген `playground-manifest`. Зелёные unit + `test:e2e:cli`.
- **Новый пакет витрины** (имя/owner — по ходу, «просто запустим»). Минимальный первый: catalog + smoke + code-preview.
- **Mock-system** и **code-view package** — отдельные инициативы/ADR.
- **Порядок (packages-first):** P1 рефактор кодгена → P2 manifest → P3 пакет витрины → **коммит** → наполнение `apps/playground` кейсами по слоям (шаги задаёт пользователь).
- Архитектура (контракты sub-generator + manifest) — главный (архитектор); реализация — owner'ы.

## Альтернативы (отклонены) {#alternatives}

- **Хэндмейд glob-реестр в `src/catalog`** — выброшенный стопгап + грязь в `src`; не использует зеркало; против «не строим в плохом окружении». Отклонён.
- **Co-located `.meta.ts` рядом с артефактом** — кодген классифицирует в мусорный `Views.*`-глобал, ломает реестр. Отклонён.
- **Авторинг меты прямо в `.capsule/`** — зеркало волатильно (регенерится), стёрлось бы. Отклонён — мета авторится в JSDoc, эмиттится в зеркало.
- **Добавить manifest как ещё одну секцию в монолит** — усугубляет 1.5к-строчную нечитаемость; рефактор всё равно нужен → делаем его первым.
