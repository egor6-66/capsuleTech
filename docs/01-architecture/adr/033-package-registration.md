---
tags: [hca, adr, accepted]
status: canon
date: 2026-06-04
last_updated: 2026-06-13
---

> [!info] Status
> **Accepted** — 2026-06-04. Закрывает interlock-зависимость ADR 032 (фаза 3 «механизм регистрации пакетов»). Разблокирует фазы 4–5 ADR 032. Реализация по фазам (см. ## План), каждая фаза — отдельный PR через owner'а.

# ADR 033 — Механизм регистрации опциональных пакетов (`capsule.app.ts: packages`)

## Контекст {#context}

Опциональные пакеты (`@capsuletech/web-map`, `@capsuletech/web-renderer`, `web-charts`) сейчас захардкожены в `Ui` через `createLazy(() => import('@capsuletech/web-map'))` в [`packages/web/core/src/ui-kit/imports.tsx`](packages/web/core/src/ui-kit/imports.tsx). Следствия:

1. **web-core статически зависит** от каждого «опционального» пакета — он прошит в ядро. Добавить пакет = править web-core (не зона аппа, не зона юзера).
2. **Семантическая путаница.** `Ui` — это per-instance проксируемый (`UiProxy`) kit мелких примитивов (Button/Input): на каждый инстанс навешивается meta/event-binding. Map/Renderer — самодостаточные stateful-модули, ближе к Widget/View; UiProxy-обвязка им не нужна (по ADR 032 они эмитят через `useEmit`/meta-bound emit, а не через DOM-авто-биндинг).

ADR 032 закрыл **логическую** половину интеграции пакета (`/controllers` + `useEmit`), но явно вынес **как package-shipped артефакт становится глобалом** в отдельный ADR (см. ADR 032 ## Зависимость). Это он.

**Принцип (из ADR 032):** канон аппа фиксирован, пакеты подстраиваются. Юзер декларирует пакет одной строкой в `capsule.app.ts` — без явных импортов в слоях.

## Решение {#decisions}

### 1. Декларация в `capsule.app.ts` — массив пакетов (self-naming)

```ts
export default defineAppConfig({
  packages: [
    '@capsuletech/web-map',                  // имя берётся из манифеста (defaultName)
    { use: '@capsuletech/web-renderer', as: 'Render' }, // override имени
  ],
});
```

Тип в `IAppConfig` (web-core):

```ts
packages?: ReadonlyArray<string | { use: string; as?: string }>;
```

Пакет **самоназывается** через манифест (см. п.2). Override (`{ use, as }`) нужен для разрешения коллизий имён (см. п.5) и вкусовщины.

### 2. Манифест пакета — subpath `@capsuletech/<pkg>/capsule`

Пакет, желающий регистрироваться, экспонирует subpath `/capsule` (multi-entry build, как `/controllers` в ADR 032) — **курируемый** манифест:

```ts
// @capsuletech/web-map/capsule
import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { MapView, Source, Layer, Marker, Terrain, Sky } from '../index';

export default defineCapsuleModule({
  name: 'Maps',                              // defaultName глобала (НЕ 'Map' — коллизия, см. п.5)
  components: { View: MapView, Source, Layer, Marker, Terrain, Sky },
  // controllers?: { ... }  — опционально, для интерлока с ADR 032 фаза 4
});
```

- `name` — defaultName глобала.
- `components` — **курируемая** поверхность (имена в namespace решает автор манифеста: `Maps.View`, `Maps.Layer`). Не сырой re-export.
- `controllers?` — опционально; одна декларация тянет **обе** половины (визуал `Maps.*` + логика `Controllers.Maps` из ADR 032). На момент ADR 033 web-map контроллеров не имеет.

`defineCapsuleModule` — identity-функция + тип-контракт, живёт в `@capsuletech/web-core/module`. Дефолтный экспорт пакета (`.`) остаётся framework-agnostic; зависимость на web-core изолирована в subpath'е `/capsule` (ацикличный граф, как `/controllers`).

### 3. Кодген — sub-generator `packages.ts` (фаза `globals`)

Новый sub-generator в [`CapsuleRegistryPlugin`](packages/builders/vite/src/plugins/capsuleRegistry.ts):

- Читает `appConfig.packages` (уже есть `loadConfigFresh` через jiti).
- Для каждого пакета **резолвит манифест** (`<pkg>/capsule`) на build-time через jiti (rooted на app), читает `name`. `as`-override побеждает `name`.
- Генерит `.capsule/registry/packages.ts`:
  ```ts
  import Maps_mod from '@capsuletech/web-map/capsule';
  export const Maps = Maps_mod.components;
  Object.assign(globalThis, { Maps });
  ```
- Генерит ambient `.capsule/@types/packages.d.ts`:
  ```ts
  declare global {
    const Maps: typeof import('@capsuletech/web-map/capsule')['default']['components'];
  }
  export {};
  ```
- Добавляет entry в `LAYER_INIT_ORDER` фазы `globals` (рядом с `wrappers`, до `app-config`/`routes`).

Имя глобала пишется литералом в `.d.ts` (нужно для `declare const <Name>`) → build-time резолв `name` обязателен. Fallback при ошибке резолва манифеста — warning + пропуск пакета (не валим dev-сервер).

### 4. web-core развязка

`Map`/`Renderer`/`Chart` уходят из `imports.tsx` и `interfaces.ts` (`ViewUiRaw`/`WidgetUiRaw`). `Ui` остаётся per-instance проксируемым kit'ом примитивов из `@capsuletech/web-ui`. web-core больше не зависит на web-map/web-renderer/web-charts.

### 5. Коллизия имён с JS-builtin

`Map` (и потенциально `Set`, `Promise`, `Date`, …) — встроенные глобалы. `declare const Map` → TS2451 «Cannot redeclare block-scoped variable», а `Map.View` в коде зарезолвится в `MapConstructor`. **Манифесты не самоназываются builtin-именами.** web-map defaultName = `Maps`. Override (`as`) — escape для юзера. (Будущее: можно добавить build-time-валидацию манифестного `name` против blocklist builtin'ов — в scope owner-builders, не блокирует.)

## Альтернативы {#alternatives}

- **Map-синтаксис `packages: { Maps: '@pkg' }` (юзер именует).** Отвергнут: дублирует defaultName, который пакет и так знает; self-naming короче. Override покрывает редкие случаи.
- **Сырой `import * as X` без манифеста.** Отвергнут: тащит не-компонентные экспорты, имя глобала надо выводить из строки пакета (хрупко), нет точки для `controllers`-интерлока ADR 032.
- **Оставить в `Ui`, сделать `Ui` расширяемым из app-config.** Отвергнут: не лечит семантику (Map ≠ примитив) и web-core-связку.

## Последствия {#consequences}

- **+** Опциональный пакет подключается одной строкой; ноль явных импортов в слоях.
- **+** web-core развязан с опциональными пакетами; `Ui` снова — чистый kit примитивов.
- **+** Одна декларация = обе половины (визуал + контроллеры ADR 032).
- **+** Курируемая типизированная поверхность (`Maps.View`), Ctrl+Click работает.
- **−** Новая build-конвенция (`/capsule` multi-entry) в регистрируемых пакетах.
- **−** Build-time резолв манифеста через jiti (новая точка отказа; смягчено warning+skip).
- **−** Коллизия с builtin-именами (смягчена self-naming-конвенцией + override).

## План (фазы; каждая — свой PR через owner'а)

1. **web-core** (owner-web-core): `IAppConfig.packages` тип + `defineCapsuleModule` + `@capsuletech/web-core/module` subpath + remove Map/Renderer/Chart из `imports.tsx`/`interfaces.ts` + тесты.
2. **web-map** (owner-web-map): `/capsule` манифест subpath (multi-entry build) → `defineCapsuleModule({ name: 'Maps', components })`.
3. **builders** (owner-builders): sub-generator `packages.ts` + `@types/packages.d.ts` + `LAYER_INIT_ORDER` entry + build-time резолв манифеста.
4. **app** (apps/ewc): `packages: ['@capsuletech/web-map']` в `capsule.app.ts` + map-Widget/View → **верификация в реальном браузере**.

После 033 → разблокированы фазы 4–5 ADR 032 (`Controllers.X` мержится в тот же namespace-кодген).

## Связанное {#related}

- [[032-package-controllers-and-useemit|ADR 032]] — логическая половина (`/controllers` + `useEmit`); этот ADR — interlock-зависимость её фаз 3–5.
- [[013-explicit-define-app-config|ADR 013]] — `defineAppConfig` / `IAppConfig`.
- [[015-remote-modules|ADR 015]] — remote modules (другой manifest-driven механизм, не пересекается).
