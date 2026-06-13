---
tags: [hca, adr, accepted]
status: canon
date: 2026-06-05
last_updated: 2026-06-13
---

> [!info] Status
> **Accepted (направление)** — 2026-06-05. Решено: module-barrel registry + auto-import namespaces вместо runtime-`globalThis`-объекта; route-scoping отдаётся **бандлеру нативно** (tree-shake + route-lazy pages), без reference-графа в кодгене. Открытый prototype-вопрос: tree-shake'ит ли Rolldown глубокий `Widgets.Forms.Auth.Login` сквозь `export * as` (→ сохраняем dot-вложенность) или нужен flat named-export фолбэк. Эмпирическое основание — build ewc 2026-06-05 (см. ## Контекст). Реализация по фазам через owner-builders.

# ADR 034 — Гранулярность code-splitting: module-backed registry вместо globalThis-объекта

## Контекст {#context}

[`CapsuleRegistryPlugin`](packages/builders/vite/src/plugins/capsuleRegistry.ts) генерит `.capsule/registry/wrappers.ts` — **один модуль**, собирающий все слои в вложенные объекты и публикующий их через `Object.assign(globalThis, { Widgets, Views, ... })`. App-код обращается к ним как к ambient-глобалам (`Widgets.Forms.Auth.Login`), без импортов — ядро HCA-DX.

Каждый Widget/View/Shape/Feature там обёрнут в `lazy(() => import(...))` (Entity — eager). Pages — route-lazy отдельно (RouterPlugin → TanStack).

**Эмпирика (build `apps/ewc`, Vite 8 / Rolldown, 2026-06-05).** ~44 JS-чанка. Реальный вес — 4 (`index` 280k, `vendor-core` 176k, `vendor-ui` 122k, `dataTable` 62k; 3 грузятся upfront). Остальные **~39 — per-layer lazy, почти все <0.75 kB** (`markersList` 0.13 · `world` 0.37 · `incidentsTable` 0.74 · `tableSync`/`mapSync` 0.68 · `incidentPreview` 0.75 · …). ~23 kB логики раздроблены на ~39 lazy-чанков → серийный intra-route waterfall + Suspense-флэш на каждом слое, при нулевой экономии размера.

**Корень — `Object.assign(globalThis, ...)` + ambient-доступ.** Глобальный объект «использован целиком», а `Widgets.X` в app-коде — рантайм-member-access. Бандлер не видит статический граф «роут → слои» → не может ни tree-shake'ить, ни раскладывать по роутам. Per-layer `lazy()` — это попытка обойти проблему ценой waterfall'а.

**Тупиковый эксперимент (proto-B, отброшен).** Сделать все слои eager (расширить `EAGER_IMPORT_LAYERS`) убирает waterfall (44→26 чанков), НО затягивает ВСЕ слои в `index` (грузится на каждом роуте). Это **не масштабируется**: на app с 10 000 виджетов login-страница тянула бы весь app в инишл-бандл. Негативный результат — подтвердил, что лечить надо не lazy/eager-флаг, а сам способ публикации реестра.

## Решение {#decisions}

**Заменить runtime-`globalThis`-объект на module-backed registry (barrel-тень папок) + auto-import namespaces. Route-scoping отдать бандлеру нативно.**

### 1. Реестр — barrel-модули, зеркалящие структуру папок

Вместо одного объекта — дерево re-export-барелов; вложенность через `export * as`:

```ts
// .capsule/registry/widgets/forms/auth/index.ts  (тень src/widgets/forms/auth/)
export { default as Login } from '@widgets/forms/auth/login';
export { default as Register } from '@widgets/forms/auth/register';

// .capsule/registry/widgets/index.ts
export * as Forms from './forms';        // → Widgets.Forms.*
export * as Tables from './tables';

// .capsule/registry/index.ts
export * as Widgets from './widgets';
export * as Views from './views';
export * as Features from './features';
export * as Shapes from './shapes';
export * as Controllers from './controllers';
export * as Entities from './entities';
```

Барелы помечаются side-effect-free (`sideEffects: false`) — условие tree-shaking'а. `Object.assign(globalThis, ...)` **убирается**.

### 2. Доступ — через `unplugin-auto-import` (DX сохранён)

Имена врапперов (`Widget`/`Page`/…) уже инжектятся auto-import'ом. Расширяем его на namespace'ы реестра:

```ts
AutoImport({
  imports: [{ '@capsule/registry': ['Widgets','Views','Features','Shapes','Controllers','Entities'] }],
  // + wrapper-имена как сейчас
});
```

App-код — **без единого ручного импорта, как сейчас**:
```tsx
const Login = Page(() => <Widgets.Forms.Auth.Login />);   // import инжектится автоматически
```

На build бандлер видит `import { Widgets } from '@capsule/registry'` + статический `Widgets.Forms.Auth.Login` → tree-shake до одного login-leaf → он попадает в чанк login-роута, dashboard-слои — нет.

### 3. Route-scoping — нативно, без reference-графа

Pages уже route-lazy (RouterPlugin → TanStack). Статические импорты (п.2) + tree-shake (п.1) дают: каждый роут-чанк содержит ровно используемые им слои; общие слои Rolldown сам выносит в shared-чанк. **Никакого графа в кодгене** — стандартное поведение бандлера для статических импортов.

### Открытый вопрос (решает прототип)

Tree-shake'ит ли **Rolldown** глубокий доступ `Widgets.Forms.Auth.Login` сквозь `export * as`-namespace? Rollup умеет; Rolldown новее.
- **Да** → сохраняем dot-вложенность (`export * as`).
- **Нет/флаки** → fallback на **flat named-export** (`export { Login, Register, ... }` плоско): bulletproof tree-shake, но теряем вложенный синтаксис (`Widgets.AuthLogin` вместо `Widgets.Forms.Auth.Login`). Решаем по результату.

## Альтернативы {#alternatives}

- **A. Оставить per-layer `lazy()` (baseline).** Масштабируется (on-demand), но per-layer waterfall + флэш. Отвергнут — исходная боль.
- **B. Все слои eager в одном объекте (proto-B).** Waterfall убирает, но тянет всё в `index` → не масштабируется (10k виджетов на login). Отвергнут эмпирикой.
- **C. Reference-граф в кодгене** (сохранить `globalThis`, кодген строит граф «роут→слои» и генерит per-route scope-модули). Работает и сохраняет DX, но **переизобретает в кодгене то, что бандлер делает сам** для статических импортов. Отвергнут как лишняя сложность против решения (module-barrel + auto-import даёт то же нативно).
- **D. Module-barrel БЕЗ auto-import** (app-код сам `import { Widgets }`). Бандлер сплитит, но теряется «ноль импортов» DX. Отвергнут — auto-import (п.2) сохраняет DX бесплатно.

## Последствия {#consequences}

### Положительные
- Route-scoping **нативный** (tree-shake + route-lazy) — без reference-графа; кодген только генерит барелы (тень папок), проще object-сборки.
- `Object.assign(globalThis)` — источник проблемы — **убран**.
- Ноль-импортов DX сохранён (через auto-import); dot-вложенность — если прототип подтвердит namespace-tree-shake.
- Интра-route waterfall и Suspense-флэш слоёв исчезают; первый визит роута — один fetch, повторный — из кеша (стандартное route-splitting).
- Типы текут из барелов сами (`import { Widgets }` типизирован) — потенциально упрощает slot-`@types`-кодген.
- Унификация: и врапперы, и реестры — через один механизм (auto-import), без раскола auto-import / globalThis.

### Отрицательные / риски
- **Зависит от Rolldown namespace-tree-shake** (глубокий `export * as`-access) — главный prototype-gate; возможен fallback на flat-имена (теряется dot-вложенность).
- Барел-кодген заменяет object-кодген в `CapsuleRegistryPlugin` — нетривиальная правка + тесты.
- `sideEffects: false` на `.capsule`-реестре обязателен; проверить, что ничего в графе слоёв не имеет реальных module-side-effects.

## План (фазы; каждая — PR через owner'а)

1. **owner-builders — прототип на ewc.** Сгенерить barrel-реестр (тень папок, `export * as`) + auto-import namespaces + `sideEffects:false`, убрать `globalThis`-assign. Re-build. **Ключевые проверки:** (1) Rolldown tree-shake'ит глубокий `Widgets.Forms.Auth.Login`; (2) `login.chunk` НЕ содержит dashboard-слоёв; (3) diff chunk-графа против baseline 2026-06-05. Решить dot vs flat.
2. **owner-builders — реализация** в `CapsuleRegistryPlugin` (барел-генератор) + auto-import config в vite-builder + тесты кодгена.
3. **app (ewc) + owner-tests — верификация.** Re-build, chunk-граф, рантайм-network в браузере (нет водопада, route-scoped), smoke.
4. **Cleanup**: убрать legacy object-`wrappers.ts` путь; обновить slot-`@types`-кодген если типы теперь текут из барелов.

## Связанное {#related}

- [[033-package-registration|ADR 033]] — тот же кодген-плагин, Vite 8 / Rolldown.
- [[019-autoimport-dirs-drop|ADR 019]] — история реестра/кодгена слоёв.
- [[010-builders-split|ADR 010]] — структура builders.
- **Смежное наблюдение (не в скоупе):** `index` 280 kB — проверить визуалайзером, не тянется ли `web-ui-creator`/редактор eager'ом в дашборд-инишл.
