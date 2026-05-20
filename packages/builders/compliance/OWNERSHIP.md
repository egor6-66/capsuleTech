---
name: @capsuletech/compliance
owner-agent: owner-builders
group: cli
status: pre-1.0
last-updated: 2026-05-20
---

# @capsuletech/compliance

AST-линтер HCA-правил: проверяет impor-нарушения (upward / horizontal / disallowed), side-effect fetch и unknown alias-теги. Потребляется `vite-builder` через `CompliancePlugin`.

## Зона ответственности

### Owns
- `packages/builders/compliance/src/check.ts` — главный чекер: babel parse + traverse, 5 видов violations
- `packages/builders/compliance/src/classify.ts` — `classify(absPath) → Layer`, `extractGroup`
- `packages/builders/compliance/src/rules.ts` — `RUNTIME_ALLOWED`, `LAYER_PREFIXES`, `CROSS_LAYER_ALLOWED`
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
- `type IViolation` — `{ file, line, column, source, layer, kind, message, hint? }`. `kind`: `'disallowed-import' | 'upward-import' | 'horizontal-import' | 'side-effect-fetch' | 'unknown-alias'`.
- `type ICheckOptions` — `{ extraAllowed?, checkSideEffects?, aliasKeys? }`.
- `classify(absPath): Layer` — классифицирует путь по слою HCA.
- `extractGroup(absPath, layer): string | null` — имя группы внутри слоя.
- `type Layer` — `'entity' | 'controller' | 'feature' | 'widget' | 'page' | 'system' | 'test' | null`.
- `formatViolation(v): string` — форматирует одно нарушение для вывода в лог.
- `formatViolations(vs): string` — форматирует массив.
- `RUNTIME_ALLOWED` — allowlist по слоям (RegExp[]).
- `LAYER_PREFIXES` — prefix-to-layer map для cross-layer alias проверок.
- `CROSS_LAYER_ALLOWED` — что какому слою разрешено импортировать.

Это контракт. Изменение `IViolation` shape или сигнатуры `check` — согласовать с vite-builder owner (`CompliancePlugin` использует оба).

## Quirks / gotchas

- **`RUNTIME_ALLOWED` — имена пакетов `@capsuletech/web-*`**, не старые `@capsuletech/style`/`state`/`ui`. Если переименовать пакет в монорепе — обязательно обновить regex здесь, иначе widget/page-импорты нового имени будут `disallowed-import`. Режим `warn` маскирует — не падает, но линтер перестаёт работать. Тесты тоже должны использовать новые имена.

- **`@babel/traverse` — CJS interop.** В `check.ts`: `const traverse = (_traverse as any).default ?? _traverse`. ESM-import возвращает namespace-объект. Без interop — `TypeError: traverse is not a function`. Не убирай эту строку.

- **`classify` не классифицирует `packages/*`.** Пути внутри `packages/` возвращают `'system'` — `check()` сразу возвращает `[]` для них. Это намеренно: framework-код не проходит через HCA-правила.

- **`type-only` импорты пропускаются.** `import type { Foo } from 'bar'` не создаёт runtime-зависимость — `checkImport` возвращает сразу при `isTypeOnly === true`. Это корректное поведение, не баг.

- **`extraAllowed` — правильный способ расширения allowlist для конкретного app.** НЕ править `rules.ts` под app-специфику. Передавать `{ extraAllowed: { feature: [/^@my\/api/] } }` в `CompliancePlugin`. Так же в `check()` напрямую.

- **`aliasKeys` — проверка `unknown-alias` активируется только когда передан `Set`.** Если `opts.aliasKeys` не задан — проверка пропускается полностью. `AppConfigPlugin` в vite-builder поддерживает `appConfigState.aliasKeys` и передаёт в `CompliancePlugin`.

- **`LAYER_ORDER` объявлен в конце `check.ts` (не экспортируется).** Используется только внутри для определения direction (upward vs horizontal). Не вытаскивай наружу без необходимости.

- **`side-effect-fetch` ловит `fetch`, `axios`, `XMLHttpRequest`.** Только identifier-level match на `CallExpression`. Обёртки вида `api.fetch(...)` не поймает — `callee.object.name === 'api'`, не `'fetch'`.

## План рефакторинга / оптимизаций

- [ ] **Bump CompliancePlugin mode `warn` → `error`** — после стабилизации allowlist в real apps. Сейчас `warn` потому что rule-set обкатывается. ADR 004. (priority: medium)
- [ ] **Добавить тест на `side-effect-fetch` через member expression** (`axios.get(...)`) — текущее поведение: не ловит. Либо зафиксировать как known limitation. (priority: low)
- [ ] **Расширить `LAYER_PREFIXES`** при появлении новых слоёв (например `@shapes/`) — держи в синхронизации с `plugins/constants.ts > LAYER_TO_NAMESPACE`. (priority: low)

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `src/__tests__/check.test.ts` | Все 5 видов violations, extraAllowed, aliasKeys, type-only skip, относительные импорты |
| Unit | `src/__tests__/classify.test.ts` | classify() по всем слоям, edge cases (test files, .capsule/, node_modules, packages/) |

Перед изменением: `pnpm --filter @capsuletech/compliance test` должен быть green.
При добавлении нового вида нарушения — обязательно добавить тест в `check.test.ts`.
При изменении `RUNTIME_ALLOWED` — проверить `check.test.ts` на актуальность имён пакетов.
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
