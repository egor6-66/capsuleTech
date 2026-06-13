---
name: @capsuletech/compliance
owner-agent: owner-builders
group: cli
status: pre-1.0
last-updated: 2026-06-13
---

# @capsuletech/compliance

AST-линтер HCA-правил: проверяет import-нарушения (upward / horizontal / disallowed), side-effect fetch, unknown alias-теги, native JSX, native JS/DOM globals, raw class-атрибуты и runtime @capsuletech/* в app-коде. Потребляется `vite-builder` через `CompliancePlugin`.

## Зона ответственности

### Owns
- `packages/builders/compliance/src/check.ts` — главный чекер: babel parse + traverse, 9 видов violations (Phase L добавил 4)
- `packages/builders/compliance/src/classify.ts` — `classify(absPath) -> Layer`, `extractGroup`
- `packages/builders/compliance/src/rules.ts` — `RUNTIME_ALLOWED`, `LAYER_PREFIXES`, `CROSS_LAYER_ALLOWED`, `HOST_TAG_HINT_SUGGESTIONS`, `NATIVE_JS_GLOBALS`, `NATIVE_JS_TIMERS`
- `packages/builders/compliance/src/format.ts` — `formatViolation` / `formatViolations` для Vite-лога
- `packages/builders/compliance/src/index.ts` — barrel
- `packages/builders/compliance/src/__tests__/check.test.ts` — тесты нарушений
- `packages/builders/compliance/src/__tests__/classify.test.ts` — тесты классификации
- `packages/builders/compliance/vite.config.mts` — self-build
- `packages/builders/compliance/package.json` exports / deps

### Не трогает
- `packages/builders/vite/src/plugins/compliance.ts` — обёртка (CompliancePlugin), не наш код, правит vite-builder owner
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant)
- `apps/*/` (user / framework-developer scope)

## Публичный API

Экспортируется через `.` entrypoint (`dist/index.mjs`):

- `check(absPath, code, opts?): IViolation[]` — главная функция. Парсит файл через babel, возвращает список нарушений. Пустой массив = чисто.
- `type IViolation` — `{ file, line, column, source, layer, kind, message, hint? }`. `kind`:
  - `'disallowed-import'` — import не из allowlist данного слоя
  - `'upward-import'` — нижний слой тащит верхний
  - `'horizontal-import'` — сосед по слою (другая группа)
  - `'side-effect-fetch'` — fetch/axios в не-feature
  - `'unknown-alias'` — @-литерал в meta.tags не зарегистрирован в capsule.app.ts
  - `'cross-zone-import'` — packages/web/<zone> импортит запрещённую zone (ADR 047 D1/D2)
  - `'native-jsx'` — HTML host-tag в HCA-слое (Phase L, 2026-06-13)
  - `'native-js'` — DOM global / raw timer в HCA-слое (Phase L, 2026-06-13)
  - `'raw-class'` — class=/className= JSX-атрибут в HCA-слое (Phase L, 2026-06-13)
  - `'app-package-import'` — runtime @capsuletech или @capsule scope в apps/*/src (Phase L, 2026-06-13)
- `type ICheckOptions` — `{ extraAllowed?, checkSideEffects?, aliasKeys? }`.
- `classify(absPath): Layer` — классифицирует путь по слою HCA.
- `extractGroup(absPath, layer): string | null` — имя группы внутри слоя.
- `type Layer` — `'entity' | 'controller' | 'feature' | 'widget' | 'page' | 'system' | 'test' | null`.
- `formatViolation(v): string` — форматирует одно нарушение для вывода в лог.
- `formatViolations(vs): string` — форматирует массив.
- `RUNTIME_ALLOWED` — allowlist по слоям (RegExp[]). После Phase L не содержит @capsuletech/* записей.
- `LAYER_PREFIXES` — prefix-to-layer map для cross-layer alias проверок.
- `CROSS_LAYER_ALLOWED` — что какому слою разрешено импортировать.
- `HOST_TAG_HINT_SUGGESTIONS` — `Record<string, string>`. Map html host-tag -> suggested Ui.* primitive. Используется в no-native-jsx rule для actionable hint.
- `NATIVE_JS_GLOBALS` — `ReadonlySet<string>`. DOM globals запрещённые в HCA-слоях (no-native-js).
- `NATIVE_JS_TIMERS` — `ReadonlySet<string>`. Raw timer functions запрещённые в HCA-слоях (no-native-js).

Это контракт. Изменение `IViolation` shape или сигнатуры `check` — согласовать с vite-builder owner (`CompliancePlugin` использует оба).

## Quirks / gotchas

- **Breaking change Phase L (2026-06-13) — RUNTIME_ALLOWED урезан.** `@capsuletech/web-ui`, `web-state`, `web-router`, `web-query`, `web-style` удалены из allowlist всех слоёв. Теперь эти импорты перехватываются правилом `app-package-import` до проверки allowlist. Mode остаётся `warn` — CompliancePlugin не изменён. Если вы добавляете `extraAllowed: { widget: [/^@capsuletech\/web-ui/] }` — это уже не нужно и не поможет: `app-package-import` перехватывает раньше allowlist.

- **`RUNTIME_ALLOWED` — имена пакетов `@capsuletech/web-*`**, не старые `@capsuletech/style`/`state`/`ui`. После Phase L старые имена тоже попадают под `app-package-import`. Если переименовать пакет — `NATIVE_JS_GLOBALS`/`NATIVE_JS_TIMERS`/`HOST_TAG_HINT_SUGGESTIONS` обновить не нужно (они не зависят от имён пакетов).

- **`no-native-js` дедупликация по `${line}:${column}:${name}`.** Если `document.querySelector` вызывается (CallExpression) и при этом это MemberExpression — только одно violation. `Set<string>` `seenNativeJs` shared на весь traverse прогон файла.

- **`no-native-jsx` ловит только JSXIdentifier с lowercase.** `<Ui.Button>` (JSXMemberExpression) и `<Button>` (PascalCase) — пропускаются. Это канон: компоненты PascalCase, host-tags lowercase.

- **`no-raw-class` ловит `class`, `className`, `classList` как JSXIdentifier И Solid namespace-директивы `class:foo={...}` как JSXNamespacedName.** Это покрывает все варианты из канона Solid.

- **`@babel/traverse` — CJS interop.** В `check.ts`: `const traverse = (_traverse as any).default ?? _traverse`. ESM-import возвращает namespace-объект. Без interop — `TypeError: traverse is not a function`. Не убирай эту строку.

- **`classify` не классифицирует `packages/*`.** Пути внутри `packages/` возвращают `'system'` — `check()` сразу возвращает [] для HCA-rules (но запускает zone-check). Это намеренно: framework-код не проходит через HCA-правила.

- **`type-only` импорты пропускаются.** `import type { Foo } from 'bar'` не создаёт runtime-зависимость — `checkImport` возвращает сразу при `isTypeOnly === true`. Это корректное поведение включая `app-package-import` — `import type` от @capsuletech/* разрешён для типизации.

- **`extraAllowed` — правильный способ расширения allowlist для конкретного app.** НЕ править `rules.ts` под app-специфику. Передавать `{ extraAllowed: { feature: [/^@my\/api/] } }` в `CompliancePlugin`. Обрати внимание: `extraAllowed` не обходит `app-package-import` (тот перехватывает до allowlist).

- **`aliasKeys` — проверка `unknown-alias` активируется только когда передан `Set`.** Если `opts.aliasKeys` не задан — проверка пропускается полностью.

- **`LAYER_ORDER` объявлен в конце `check.ts` (не экспортируется).** Используется только внутри для определения direction (upward vs horizontal).

- **`side-effect-fetch` ловит `fetch`, `axios`, `XMLHttpRequest`.** Только identifier-level match на `CallExpression`. Обёртки вида `api.fetch(...)` не поймает. Не пересекается с `no-native-js` (fetch не в NATIVE_JS_GLOBALS/NATIVE_JS_TIMERS).

- **JSDoc `*\/` в комментариях — oxc limitation.** Vite 8 + oxc трактуют `*/` внутри JSDoc-блока как его закрытие. Не пиши `Views.*/Controllers.*/` в комментариях — используй `Views, Controllers etc.`.

## План рефакторинга / оптимизаций

- [ ] **Bump CompliancePlugin mode `warn` -> `error`** — после L0-inventory (сбор всех violations в реальном app-коде после merge Phase L). Сейчас warn потому что rule-set обкатывается. ADR 004. (priority: medium)
- [ ] **L0-inventory**: после merge Phase L запустить compliance по всем apps/* в warn-mode и собрать полный список noncompliant files. На основе inventory — план Phase L-fix.
- [ ] **Расширить HOST_TAG_HINT_SUGGESTIONS / NATIVE_JS_GLOBALS / NATIVE_JS_TIMERS** по мере inventory L0-phase (warn-mode, открытая задача). Сейчас базовый набор, реальный app-код выявит пропуски.
- [ ] **classify.ts не знает про `shapes/` и `entities/` директории** — apps их имеют, но compliance их не классифицирует (возвращает null -> check() пропускает файл). Отдельная задача: расширить Layer + LAYER_RX, обновить tests. Это существующая дыра, не закрыта в Phase L.
- [ ] **Добавить тест на `side-effect-fetch` через member expression** (`axios.get(...)`) — текущее поведение: не ловит identifier у `.object`. Либо зафиксировать как known limitation. (priority: low)
- [ ] **Расширить `LAYER_PREFIXES`** при появлении новых слоёв (например `@shapes/`) — держи в синхронизации с `plugins/constants.ts > LAYER_TO_NAMESPACE`. (priority: low)
- [ ] **AppConfigPlugin transform -> AST-rewrite** не наша задача, но смежная: если AppConfigPlugin сломает import-структуру файлов — compliance может начать видеть их неправильно.

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `src/__tests__/check.test.ts` | Все 9 видов violations (5 исходных + 4 Phase L), extraAllowed, aliasKeys, type-only skip, относительные импорты |
| Unit | `src/__tests__/classify.test.ts` | classify() по всем слоям, edge cases (test files, .capsule/, node_modules, packages/) |
| Unit | `src/__tests__/zones.test.ts` | Zone-canon check (ADR 047 D1/D2) |

Перед изменением: `pnpm --filter @capsuletech/compliance test` должен быть green.
При добавлении нового вида нарушения — обязательно добавить тест в `check.test.ts`.
При изменении `RUNTIME_ALLOWED` — проверить `check.test.ts` на актуальность.
Перед release: `pnpm test:e2e:cli` обязателен.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| vite-builder (CompliancePlugin потребляет check + formatViolations) | owner-builders |
| lib-builder (используется в vite.config.mts compliance для self-build) | owner-builders |
| CLI (координация релиза) | owner-cli |

## Release group

- `cli` — fixed group: cli + compliance + lib-builder + shared-file-manager + vite-builder

Изменение `IViolation` shape или поведения `check()` — согласовать с vite-builder owner (CompliancePlugin format'ер) перед release.
