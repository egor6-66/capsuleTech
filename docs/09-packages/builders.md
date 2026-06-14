---
tags: [hca, package, builders]
status: documented
last_updated: 2026-05-18
---

# @capsuletech/builders

**Расположение:** `packages/builders/`
**Релиз:** в группе `cli` (fixed-versioning, `releaseTagPattern: cli@{version}` — см. `nx.json`)

Зонтичная директория для четырёх **build-time** пакетов. Сюда попадает всё, что выполняется при сборке (Vite-конфиги, плагины, lint-правила, AST-линтер) — в отличие от `packages/web/` (runtime-фреймворк) и `packages/shared/` (cross-group runtime-утилиты).

> [!info] Зачем выделены отдельно
> ADR [[010-builders-split|010]] объясняет: семантическая группировка («build-time vs runtime»), синхронный релиз tooling'а, имена пакетов отражают роль. Критерий принадлежности: пакет используется в `vite.config.mts` или `capsule.config.ts`, а не в JSX/runtime-коде.

## Пакеты

| Пакет | Назначение | Кто потребитель |
|---|---|---|
| `@capsuletech/lib-builder` | `libConfig()` — каноничный Vite UserConfig для библиотек | каждый `packages/**/vite.config.mts` |
| `@capsuletech/vite-builder` | `capsuleConfig` + 9 Vite-плагинов для apps | `apps/<app>/capsule.config.ts` |
| `@capsuletech/compliance` | AST-линтер архитектурного регламента HCA | `vite-builder/plugins/compliance.ts` |
| `@capsuletech/biome-config` | Shared Biome preset | корневой `biome.json` (extends) |

Все четыре релизятся одним release-group'ом `cli` (вместе с `@capsuletech/cli` и `@capsuletech/shared-file-manager`) — версии всегда синхронны, чтобы не было ловушки «`vite-builder@new` + `compliance@old` несовместимы».

---

## @capsuletech/lib-builder

**Файлы:** `packages/builders/lib/src/libConfig.ts`
**Зависимости:** только `peer` (`vite`, `vite-plugin-solid`, `vite-plugin-dts`, `vite-tsconfig-paths`) — пакет zero-deps namespace'ом, чтобы разорвать цикл с `compliance`.

### libConfig()

Фабрика готового Vite `UserConfig` для библиотек. Один вызов закрывает `formats: ['es']`, sourcemap, dts, clean dist `package.json`, externalization Rollup'ом, resolve-conditions под runtime.

```ts
// packages/web/core/vite.config.mts
import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: 'src/index.ts',
  name: 'CapsuleCore',
  runtime: 'browser',        // 'browser' | 'node' | 'isomorphic'
});
```

**Опции** (полный список — [libConfig.ts:11-46](../../packages/builders/lib/src/libConfig.ts:11)):

| Опция | Тип | По умолчанию | Что делает |
|---|---|---|---|
| `entry` | `string \| Record<string, string>` | — | одиночная entry-point или multi-entry для sub-exports |
| `name` | `string` | — | имя для lib-mode metadata |
| `runtime` | `'browser' \| 'node' \| 'isomorphic'` | `'browser'` | переключает external lists и resolve-conditions |
| `outDir` | `string` | `'dist'` | куда складывать билд |
| `external` | `(string \| RegExp)[]` | `[]` | доп. externals поверх дефолтов |
| `bundleDependencies` | `(string \| RegExp)[]` | `[]` | принудительно ВШИТЬ в bundle (обходит external) |
| `dts` | `boolean` | `true` | генерировать `.d.ts` через vite-plugin-dts |
| `emitPackageJson` | `boolean` | `true` | писать очищенный `dist/package.json` |
| `plugins` | `Plugin[]` | `[]` | доп. плагины поверх дефолтных |
| `alias` | `Record<string, string>` | `{}` | доп. resolve.alias |
| `override` | `UserConfig` | — | сырое слияние с финальным конфигом |

### Что external по умолчанию

`browser` runtime — `solid-js`, `solid-js/*`, `@solidjs/*`, `@tanstack/*`, `@kobalte/*`, `@motionone/*`, `@xstate/*`, `xstate`, `lucide-solid`, `zod`, `class-variance-authority`, `clsx`, `tailwind-merge`, `solid-motionone`, `jiti`, `tslib`, всё `@capsuletech/*`.

`node` runtime — всё выше + node builtins (с `node:` префиксом тоже), `vite`/`vite/*`, `vite-plugin-*`, `@nx/*`, `nx/*`, `@swc-node/*`, `@swc/*`, `@babel/*`, `ts-morph`, `tailwindcss`, `@tailwindcss/*`, `unplugin-auto-import`, `chalk`, `commander`, `ora`, `enquirer`, `inquirer`, `execa`, `conf`, `es-toolkit`, `fsevents`.

`isomorphic` = `browser + node`.

### bundleDependencies

Используй когда нужно затащить workspace-пакет внутрь dist (защититься от resolve-проблем у внешнего consumer'а):

```ts
libConfig({
  entry: 'src/index.ts',
  name: 'X',
  bundleDependencies: [/^@capsuletech\/compliance/],  // compliance окажется заинлайнен
});
```

### emitPackageJson

При `emitPackageJson: true` (default) — `closeBundle` пишет `dist/package.json`, полученный из root-`package.json` фильтрацией:
- удаляет `scripts`, `devDependencies`, `files`, `publishConfig`, `exports`;
- срезает `./dist/` префикс с `main`/`module`/`types`/`typings` (теперь они относительны к dist/).

Зачем — позволяет publish-как-есть из `dist/` и убирает publint-warning об inconsistent resolution из-за nested-exports. Регрессия закрыта (S-3 в `cleanup-plan`), 8 тестов в `cleanRootPkgForDist` секции [libConfig.test.ts:219](../../packages/builders/lib/src/__tests__/libConfig.test.ts:219).

---

## @capsuletech/vite-builder

**Файлы:** `packages/builders/vite/src/`
**Зависимости:** `@babel/parser`, `@capsuletech/compliance`, `@capsuletech/lib-builder`, `vite-plugin-solid` (peer: `solid-js`, `vite`).

### capsuleConfig

Сборка полного Vite-конфига для apps приложения (`apps/<app>/`). Точка входа всех остальных плагинов.

```ts
// apps/sandbox/capsule.config.ts
import { defines } from '@capsuletech/vite-builder';

export default defineCapsuleConfig({
  devServerPort: 3000,
});
```

Подробности конфига и плагины — см. [[vite-plugins]].

### Плагины (краткий список)

| Плагин | Что делает |
|---|---|
| `HMRWrappingPlugin` | `const X = Page(...)` → `(props) => Page(...)(props)` + добавляет `export default` |
| `AppConfigPlugin` | загружает `capsule.app.ts` через jiti → пишет `.capsule/@types/app-tags.d.ts` + `.capsule/app-config.gen.ts` |
| `ExportGeneratorPlugin` | сканит `apps/*/src/{widgets,entities,controllers,features,shapes}` → пишет `.capsule/registry/wrappers.ts` + `.capsule/@types/slots.d.ts` |
| `EndpointsRegistryPlugin` | сканит `apps/*/src/endpoints/**` → пишет `.capsule/registry/endpoints.ts` + `.capsule/@types/api.d.ts` |
| `RouterPlugin` | sub-плагин: `ensureRootRoutePlugin` + page-mirror generator + `TanStackRouterVite` |
| `EnsureScaffoldPlugin` | если в `.capsule/` нет `index.html`/`index.ts`/`bootstrap.tsx`/`paths.config.json` — копирует из шаблонов |
| `CompliancePlugin` | wrapper над `check()` — режимы `warn` (default) / `error` |
| `AliasesPlugin` | мерджит `tsconfig.base.json` paths + `apps/<app>/.capsule/paths.config.json` → `tsconfig.paths.json` + Vite `resolve.alias` |
| `staticCopyPlugin` | `closeBundle`-копирование (используется внутри собственного `vite.config.mts`) |

### actions

```ts
import { createDevCapsuleServer, buildCapsuleApp } from '@capsuletech/vite-builder';

// дёргается из CLI (packages/cli/src/actions/dev.ts)
await createDevCapsuleServer(config, root, workspaceRoot);
await buildCapsuleApp(config, root, workspaceRoot);
```

### Single source of truth

`packages/builders/vite/src/plugins/constants.ts` — **единственное место**, где правятся:

- `WRAPPER_NAMES` — имена wrapper'ов (`Page`/`Widget`/`Entity`/`Controller`/`Feature`/`Shape`). Подхватывается HMRWrappingPlugin + AutoImport.
- `DEFINE_FACTORIES` — config-time фабрики (`{ '@capsuletech/web-query': ['defineEndpoint'] }`). Подхватывается AutoImport, не участвует в HMR-обёртке.
- `LAYER_TO_NAMESPACE` — mapping `widgets → Widgets`, `entities → Entities` и т.д. Подхватывается ExportGeneratorPlugin.

Хочешь добавить новый wrapper-слой — правишь ЭТО, плагины подхватят.

---

## @capsuletech/compliance

**Файлы:** `packages/builders/compliance/src/`
**Зависимости:** `@babel/parser`, `@babel/traverse`, `@babel/types`.

Подробная пользовательская дока — [[compliance|@capsuletech/compliance]] (вынесена отдельно из-за объёма). Тут — суть и связь с vite-builder.

AST-линтер четырёх правил HCA: upward-imports, horizontal-imports, disallowed-imports, side-effect-fetch + пятое — `unknown-alias` в `meta.tags`. Запускается через `CompliancePlugin` на каждый `transform`-хук.

### Режимы

- **`warn`** (default) — warning в логе Vite, билд не падает. Сейчас активен.
- **`error`** — нарушение валит билд / dev-сервер. Включаем когда репо чистое.

### Расширение под app

```ts
// в собственном Vite-конфиге, если поднимаешь без capsuleConfig
plugins.CompliancePlugin({
  mode: 'warn',
  extraAllowed: { feature: [/^@my\/api/, /^@my\/services/] },
}),
```

---

## @capsuletech/biome-config

**Файлы:** `packages/builders/biome/biome.json`
**Зависимости:** none.

Shared preset Biome. Подключается через `extends` в `biome.json` корня репозитория:

```json
// biome.json (root)
{
  "$schema": "https://biomejs.dev",
  "extends": ["./packages/builders/biome/biome.json"]
}
```

Что в preset'е:
- formatter: 2 пробела, single quote JS / double quote JSX, trailing commas, semicolons, line 100;
- linter: recommended + `useFragmentSyntax: error`, `useNodejsImportProtocol: error`, `useArrowFunction: error`;
- ослаблено: `noUnusedVariables`, `noNonNullAssertion`, `noExplicitAny`, `useTemplate`, `useBlockStatements`, `noForEach`, `noConstructorReturn`, `noDelete`.

> [!info]
> Пакет не содержит `src/`/`dist/` — только `biome.json`. `package.json > files: ["biome.json"]` + `exports: { "./biome.json": "./biome.json" }` гарантируют, что в npm-тарбол попадает именно конфиг, и Node-resolution пускает внешнего consumer'а в файл.

---

## Команды

```bash
# Сборка одного пакета
pnpm --filter @capsuletech/lib-builder build
pnpm --filter @capsuletech/vite-builder build
pnpm --filter @capsuletech/compliance build

# Watch-режим (для разработки плагинов)
pnpm dev:builders   # параллельно все, кроме biome-config

# Тесты пакета
pnpm --filter @capsuletech/vite-builder test

# Проверка экспорт-метаданных
pnpm audit:exports  # publint + attw

# Release (всю группу cli одной волной)
pnpm release:local:cli
```

> [!important]
> После правок в `packages/builders/vite/src/` — **обязательно** `pnpm --filter @capsuletech/vite-builder build` + полный рестарт dev-сервера приложения (Ctrl+C, не `r`). Apps читают `dist/index.mjs`, плагин-модули подгружаются ровно один раз при старте Node-процесса.

## Связь со стеком

- [[vite-plugins]] — подробный разбор каждого плагина
- [[compliance|@capsuletech/compliance]] — пользовательский гайд по линтеру
- [[cli|@capsuletech/cli]] — actions из vite-builder дёргаются именно отсюда
- [[api-middleware]] — EndpointsRegistryPlugin + AppConfigPlugin собирают `services.api`
- [[010-builders-split|ADR 010]] — обоснование разделения на 4 пакета
- [[013-explicit-define-app-config|ADR 013]] — почему `defineAppConfig` теперь explicit-import

> [!ai] Для Claude-инстансов
> Шпаргалка с грабли + «что менять когда» — [[builders|docs/_meta/builders.md]].
