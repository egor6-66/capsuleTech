---
tags: [hca, package, core]
status: documented
---

# @capsule/core

**Расположение:** `packages/core/`
**Зависит от:** `@capsule/state`, `@capsule/router`, `@capsule/ui`, `@capsule/style`, `@capsule/profiler`, `@capsule/shared-vite`, `@capsule/file-manager`

Сердце фреймворка. Тут живут:

- 5 wrapper-функций ([[layers|слои HCA]]),
- двойная Proxy-механика ([[ui-proxy]] + [[controller-proxy]]),
- Builder-обёртки для запуска `@capsule/shared-vite`,
- Provider'ы (`Base`).

## Карта файлов

```
packages/core/src/
├── index.ts                   главный barrel: wrappers, Providers, interfaces
├── interfaces.ts              ICapsuleConfig
├── index.css                  глобальные стили (импортируется в createRoot)
├── wrappers/
│   ├── index.ts               export Page/Widget/Entity/Controller/Feature
│   ├── ctx.ts                 Solid Context — { state, store, controller, parent }
│   ├── interfaces.ts
│   ├── ui/
│   │   ├── entity.tsx         EntityWrapper
│   │   ├── widget.tsx         WidgetWrapper
│   │   ├── page.tsx           PageWrapper (+Outlet)
│   │   ├── interfaces.ts      IEntityWrapper, IWidgetWrapper, IPageWrapper
│   │   └── ui-kit/
│   │       ├── imports.tsx    lazy-импорты Button/Input/Card/Field/...
│   │       ├── proxy.tsx      UiProxy
│   │       └── index.tsx
│   └── logic/
│       ├── controller.tsx     ControllerWrapper
│       ├── feature.tsx        FeatureWrapper (≈ копипаста ControllerWrapper)
│       ├── interfaces.ts      IDefineStateSchema, IHandlerApi
│       └── utils/
│           ├── proxy.ts       ControllerProxy
│           ├── helpers.ts     pickByTags / omitByTags / matchByTags
│           └── index.ts
├── builder/
│   ├── index.ts               createDevServer / createPreviewServer / buildApp
│   └── config.ts              buildConfig — собирает Vite-конфиг из плагинов и алиасов
├── configs/
│   ├── index.ts
│   └── defineWebConfig.ts     identity-функция (типизирует IConfig)
├── providers/
│   ├── index.ts
│   └── base.tsx               Base — VitalsMonitoring + RouterProvider
└── create/
    ├── index.ts
    ├── createRoot.ts          render(Component, #root)
    └── createModuleTree.ts    runtime-аналог ExportGeneratorPlugin (через import.meta.glob)
```

## Точки входа

```ts
// @capsule (= @capsule/core)
export { Page, Widget, Entity, Controller, Feature } from './wrappers';
export * as Providers from './providers';
export * from './interfaces';
```

Дополнительные подпути (через ручные алиасы Vite, см. `builder/config.ts`):
- `@capsule/core/builder` → `./builder/index.ts`
- `@capsule/core/create` → `./create/index.ts`

## Зависимости wrapper'ов друг от друга

```
Page ────┐
Widget ──┼─→ Ui (lazy from @capsule/ui)
Entity ──┘   + UiProxy(ctx)
                ↑
                ctx ← Solid Context
                ↑
Controller, Feature ─→ создают ControllerProxy и кладут в Context
                       ↑
                       useMachine(createState(...))  // @capsule/state
```

## Что **не** входит в core

- API-клиенты — это уровень приложения (`apps/<app>/services/`).
- Bridge между Solid и XState — это `@capsule/state`.
- UI-компоненты — `@capsule/ui`.

## Связанное

- [[layers]]
- [[ui-proxy]]
- [[controller-proxy]]
- [[state|@capsule/state]]
- [[ui|@capsule/ui]]
