---
tags: [hca, system, building.ts]
status: documented
---

# 🛠️ Vite-плагины

Все плагины живут в `packages/builders/vite/src/plugins/` и подключаются в `packages/builders/vite/src/defines/capsuleConfig.ts` (раньше — `packages/system/vite/src/plugins/` + `packages/core/src/builder/config.ts`, до builders-consolidation, PR #20).

## CapsuleRegistryPlugin

**Файл:** `packages/builders/vite/src/plugins/capsuleRegistry.ts`

Unified codegen-оркестратор. Поглотил ExportGeneratorPlugin, EndpointsRegistryPlugin и AppConfigPlugin. Поддерживает в актуальном состоянии всё, что генерируется в `.capsule/`:

```
.capsule/registry/wrappers.ts    — runtime реестр (lazy-импорты)
.capsule/@types/slots.d.ts       — TS ambient-декларации реестров
.capsule/registry/endpoints.ts   — runtime реестр endpoints
.capsule/@types/api.d.ts         — TS типы endpoints
.capsule/app-config.gen.ts       — сгенерированный рантайм app-конфига
.capsule/bootstrap.tsx           — точка входа (порядок = LAYER_INIT_ORDER)
```

### wrappers.ts и slots.d.ts

`wrappers.ts` — глубокое дерево `lazy()`-импортов (entities — eager, так как они plain config, не Solid-компонент):

```ts
// генерируется автоматически
import { lazy } from 'solid-js';
export const Widgets = {
  Forms: {
    Auth: lazy(() => import('@widgets/forms/_auth') as Promise<{ default: any }>),
  },
};
export const Entities = {
  Users: (await import('@entities/users')).default,
};
// последняя строка — side-effect для глобалов:
Object.assign(globalThis, { Widgets, Views, Features, Shapes, Controllers, Entities });
```

`slots.d.ts` генерируется функцией `generateWrappersTypes`. Для каждого из шести namespace'ов (`Widgets`, `Views`, `Features`, `Shapes`, `Controllers`, `Entities`) — как заполненных, так и пустых — эмитируется пара:

```ts
declare global {
  interface Widgets { Forms: { Auth: typeof import('...').default }; }
  const Widgets: Widgets;

  interface Views {}
  const Views: Views;

  // … и так для всех шести namespace'ов
}
export {};
```

`interface <NS>` — TS-**тип** (форма реестра). `const <NS>: <NS>;` — ambient **value-binding**, благодаря которому TypeScript принимает `<Widgets.Forms.Auth>`, `Widgets.Headers.Main` и т.п. как значения в app-TSX.

**Почему value-binding живёт в slots.d.ts, а не в AutoImport.** Коммит #165 убрал `dirs:`-сканирование registry из AutoImport (правильно — оно создавало circular через `endpoints`). После этого плюральные реестры стали type-only для TS. Возврат плюралей в `AutoImport > imports` воскресил бы цикл #165. Решение — `const <NS>: <NS>;` в ambient-декларации: никакого runtime-импорта не инжектируется, значения populate'ятся `wrappers.ts` через `Object.assign(globalThis, ...)` как и раньше.

**`endpoints` глобал намеренно не добавлен** в `slots.d.ts` — в Feature он приходит как `services.api.X.Y`.

**Initial scan:** при старте dev-сервера плагин рекурсивно обходит `src/**` единожды (флаг `scanned`). Без этого chokidar (`ignoreInitial: true`) пропускает существующие файлы.

**Порядок загрузки (LAYER_INIT_ORDER):** единственная точка контроля порядка import'ов в `bootstrap.tsx`. Добавляешь новый слой → добавляешь запись в `LAYER_INIT_ORDER`, bootstrap обновится автоматически.

> [!warning]
> При пустом файле (например, `loginForm.tsx` нулевой длины) плагин всё равно создаст запись в реестре, и при попытке использовать её в JSX произойдёт runtime-error.

## RouterPlugin

**Файл:** `packages/builders/vite/src/plugins/router/index.ts`

Двухсоставной плагин:

1. **Generator** — следит за `apps/<app>/src/pages/**`. На каждый файл создаёт зеркальный route-файл из шаблона:
   ```
   src/pages/auth/login.tsx
        ↓
   .capsule/routes/__pages/__auth/login.tsx
   ```
   Содержимое генерируется из `template/__name__.tsx.template` через `generateFromTemplates` (`@capsuletech/file-manager`):
   ```tsx
   import { lazy } from 'solid-js';
   const Login = lazy(() => import('@pages/_auth/login') as Promise<{ default: any }>);
   import { createFileRoute } from '@tanstack/solid-router';
   export const Route = createFileRoute('/_auth/login')({ component: Login });
   ```

2. **TanStackRouterVite** — стандартный плагин TanStack, который из `.capsule/routes/` собирает `routeTree.gen.ts`.

**Префикс `__`** в путях директорий — это TanStack-конвенция для «pathless layout» сегментов.

**Защита:** перед `rm` нормализуются пути и блокируется удаление корневого `outDir`.

## CompliancePlugin

**Файл:** `packages/builders/vite/src/plugins/compliance.ts`

Тонкая обёртка над `@capsuletech/compliance.check()`. Запускается в `transform`-хуке (enforce: 'pre'), парсит файл через babel, ловит upward / horizontal / disallowed import + side-effect-fetch.

Дефолтный режим `warn` — нарушения логируются как warnings, dev-server не валится. Переключается в `error` когда репо чистое:

```ts
plugins.CompliancePlugin({ mode: 'error' });
```

Подробнее — [[compliance|@capsuletech/compliance]].

## HMRWrappingPlugin

**Файл:** `packages/builders/vite/src/plugins/HMRWrapping.ts`

Pre-transform на babel-AST. Решает проблему: HMR в Solid требует `export default`, и не любит, когда экспортируется значение, а не компонент.

**Что делает:**

```tsx
// исходник
const Login = Page(({ Layout }) => <Layout />);
```

```tsx
// после плагина
const Login = (props) => Page(({ Layout }) => <Layout />)(props);
export default Login;
```

**Триггеры:** распознаются вызовы `Page`, `Widget`, `Entity`, `Feature`, `Controller` (можно расширить через аргумент плагина).

**Что меняется:**
- имя переменной капитализируется (`login` → `Login`),
- инициализация оборачивается в стрелку с пробросом `props`,
- если `default export` отсутствует — добавляется.

**Без этого плагина:** при HMR Solid роняет приложение с ошибкой про невалидный компонент.

> [!warning] Грабли при дебаге
> `@capsuletech/vite-builder` отгружается консьюмеру **только через `dist/`** (см. `package.json#main`). Это значит:
> 1. Правка в `src/plugins/HMRWrapping.ts` без `pnpm --filter @capsuletech/vite-builder build` ни на что не повлияет.
> 2. **После** ребилда нужно **полностью убить** dev-процесс (Ctrl+C). `r` в Vite-prompt и HMR-reload **не** перечитывают плагин-модули — они импортятся ровно один раз при старте сервера.
>
> Быстрый smoke-тест что плагин действительно подтянулся: поставить `console.log('[HMR] module loaded')` на верхнем уровне (вне `transform`). Если на старте лога нет — dev-процесс держит старую `dist` в памяти Node.

## Watcher (общий ресурс)

**Файл:** `packages/builders/vite/src/utils/watcher.ts`

Singleton `WatcherManager` подписывает несколько плагинов на один `server.watcher` без дублирования. И ExportGenerator, и RouterPlugin используют его.

API:
```ts
watcherManager.init(server, watchPath);
watcherManager.subscribe(watchPath, {
  onStructureChange: (event, paths) => { ... },
  onContentChange: (paths) => { ... },
});
```

## Сборка конфига

**Файл:** `packages/builders/vite/src/defines/capsuleConfig.ts`

```ts
{
  root: '<workspace>/.capsule',           // Vite работает из .capsule, не из apps/sandbox
  build: { rollupOptions: { input: '.capsule/index.html' } },
  plugins: [
    ExportGeneratorPlugin({ out: '.capsule/registry/wrappers.ts', watchDir: 'src' }),
    RouterPlugin({ watchDir: 'src', outDir: '.capsule/routes' }),
    HMRWrappingPlugin(),
    tsconfigPaths({ projects: ['.capsule/paths.config.json'] }),
    solidPlugin(),
    tailwindcss(),
    AutoImport({
      imports: [{ '@capsuletech/core': ['Page', 'Widget', 'Entity', 'Controller', 'Feature'] }],
      dirs: ['.capsule/registry'],
      dts: './@types/capsule-imports.d.ts',
    }),
  ],
  resolve: { alias: [...] },              // ручные алиасы для @capsuletech/*
}
```

> [!warning]
> Алиасы здесь и в `tsconfig.base.json` дублируются. Если добавляешь пакет — обнови **обе точки**.

## Связанное

- [[auto-import]]
- [[cli]]
- [[core|@capsuletech/core]]
