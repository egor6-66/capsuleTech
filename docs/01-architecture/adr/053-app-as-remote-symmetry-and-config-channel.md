---
tags: [hca, adr, proposed, web-remote, app-as-remote, transport, config-channel]
status: proposed
date: 2026-06-19
last_updated: 2026-06-19
supersedes: []
extends:
  - 015-remote-modules
---

> [!warning] Status: proposed
> Фиксирует **consumer model** для `@capsuletech/web-remote`: каноническая форма «любой capsule app может быть подключён как remote, не меняя свой код». Дополняет [[015-remote-modules|ADR 015]] (транспортный контракт + pluggable transports) — 015 описывает **как пакет устроен**, 053 описывает **как с ним взаимодействует app**. Имплементация — Phase 1 MVP (см. `docs/_meta/briefs/web-remote-phase1-renderer-mvp.md`).

# ADR 053 — App-as-Remote: симметрия standalone ↔ embedded + двухканальный контракт (props vs config)

## Контекст {#context}

[[015-remote-modules|ADR 015]] зафиксировал, что Capsule пишет свой remote-runtime (не оборачивает Module Federation) с pluggable-транспортом. Phase 0 (skeleton + `src/interfaces.ts`) уже в main. Amendment 2026-06-19 переупорядочил roadmap: первая phase реализации — iframe (post-message), потому что появился реальный consumer — `@capsuletech/web-renderer` как standalone runtime внутри `@capsuletech/web-studio` creator-mode.

При подготовке implementation-брифа для Phase 1 (`docs/_meta/briefs/web-remote-phase1-renderer-mvp.md`) выяснилось, что 015 описывает **транспорт и lifecycle**, но не отвечает на главный вопрос consumer'а: **по какой модели app общается с host'ом**. Текущий бриф решает это ad-hoc (initial-only props, manual `.on()` subscriptions, public-folder inject для демо). Это противоречит концепции, которую заказывает user: «remote — это универсальная обёртка, которая делает любой capsule app подключаемым как модуль, и снаружи он ощущается как domain-пакет».

### Pain 1 — Asymmetry между standalone и embedded {#pain1}

Capsule app в `apps/<name>/` сегодня имеет один путь жизни: свой `pnpm dev`, свой dev-server, свой URL. Когда тот же app встраивается в host'а как `<Remote name="x">`, без архитектурной симметрии нужно писать **второй entry point**, который дублирует bootstrap-логику (создание Solid root'а, инстанцирование `RouterProvider`/`BaseProviders`, чтение конфига) и при этом понимает что находится в embedded-контексте. Дрейф между двумя путями неизбежен: фича работает standalone, ломается в embedded; компонент рендерится embedded, ломается standalone.

Альтернатива — app **не знает** в каком режиме живёт. Один entry-контракт; bootstrap-обвязка одинаковая; код HCA-слоёв идентичный. Switch между режимами — на уровне remote-обёртки (host-side `<Remote>` + iframe-shell), не на уровне app-кода.

### Pain 2 — Per-instance props ≠ ambient config {#pain2}

Текущий бриф подразумевает один поток данных от host к remote — «props». Но в реальности их два:

- **Runtime props** — то что host передаёт **в конкретный mount**: `<Remote name="renderer" schema={editorSchema()}>`. Это значения JSX-attributes, специфичные для этой ноды.
- **Ambient app config** — конфигурация самой подключаемой апы как сущности: `serverUrl`, `authToken`, `theme`, `locale`. В standalone-режиме читается из `apps/<app>/capsule.config.ts` / env / `IAppConfig`; в embedded — должна override'иться host'ом без вмешательства в app-код.

Если их смешать, симметрия со standalone ломается: в standalone app читает `useAppConfig().serverUrl`, в embedded должен читать тот же `serverUrl` из `props.serverUrl` (специфичный bootstrap-параметр). Код HCA-слоёв расходится между режимами.

Конкретный кейс (формулировка user'а): **один и тот же app `apps/geo` встроен дважды на одной странице с разными `serverUrl`** (одна карта смотрит в зону A, вторая — в зону B). Без отдельного config-канала это невозможно элегантно: либо props-канал начинает обслуживать оба смысла (нарушение разделения), либо app получает второй вход (нарушение симметрии).

### Pain 3 — Initial-only props превращают consumer'ов в boilerplate-машины {#pain3}

Renderer-followup упрётся в это сразу: studio передаёт schema через реактивный signal, рендерер обязан перерисоваться. Если контракт `<Remote schema={signal()}>` не реактивен «из коробки», каждый consumer пишет:

```ts
createEffect(() => {
  remote('renderer').send('schema.update', editorSchema());
});
```

Domain-пакеты ([[041-composition-distribution-model|ADR 041]], [[047-frontend-architecture-zones-cycle-vendor|ADR 047]]) такого boilerplate'а **не требуют** — `<Pkg.Thing prop={signal()}>` работает реактивно по дефолту, потому что Solid сам трекает property access на props-объекте. Если remote-обёртка не воспроизводит это поведение, обещание «remote ощущается как domain-пакет» нарушено.

### Pain 4 — Manual `.on()` subscription ломает обещание «как domain-пакет» {#pain4}

Domain-пакеты по [[041-composition-distribution-model|ADR 041]] эмиттят именованные события через `useEmit`, host пишет `<Pkg.Thing onClicked={cb}>`. Если remote требует `useRemote().remote('x').on('clicked', cb)` руками — это второй API-стиль для пары host/consumer; учить пользователя двум разным способам communication с подключаемым кодом — антипаттерн.

### Pain 5 — Демо «public-inject» скрывает архитектуру {#pain5}

Текущий бриф предлагал хостить remote-bundle через `public/`-инжект host-приложения. Это работает технически, но скрывает главное свойство концепции: **app — самостоятельная единица деплоя**. Если демо не показывает, что `apps/remote-hello` запускается **сам по себе** на своём порту, а host (`apps/remote-demo`) лишь **подключается** к нему — концепция не валидирована, и build-pipeline для будущих real-world deploy'ев останется неспроектированным.

## Решение {#decisions}

### 1. App-as-Remote: один app, два режима, общий entry-контракт {#decision-app-as-remote}

Любой `apps/<name>` поддерживает оба режима через единый lifecycle-entry:

```ts
// apps/<name>/src/standalone.ts (новый файл рядом с main.tsx)
import { startApp } from './startApp';

export const bootstrap: IRemoteBootstrap = (root, { props, config, channel }) => {
  return startApp(root, { configOverride: config, runtimeProps: props, eventSink: channel });
};
```

`startApp(root, opts?)` — общий helper, который инстанцирует Solid root + `BaseProviders` + `RouterProvider` + `EmitProvider` + читает `IAppConfig` (с применением `configOverride` если передан). `apps/<name>/src/main.tsx` (standalone entry) — вызывает тот же `startApp(document.getElementById('app'))` без `opts`. `bootstrap` (embedded entry) — вызывает с opts от host'а.

**Где живёт `startApp` — canonical helper `createCapsuleApp` в `@capsuletech/web-core/bootstrap`.** В Phase 1 demo-apps пишут обвязку руками (per-app `src/startApp.ts`); Phase 1a canonization выносит её в `@capsuletech/web-core/bootstrap` subpath (zone owner-web-core), чтобы `main.tsx` + `standalone.ts` каждого app'а стали 3-5 строк без копипасты. Per-app private helper в Phase 1 — приемлемая стартовая точка; при втором remote-capable app'е без canonical helper'а копипаста неизбежна (см. risks #7a).

**HCA-слои внутри app не знают режима.** `useAppConfig()` возвращает merged config; `useEmit('eventName', payload)` маршрутизируется либо в локальную app-event-bus (standalone), либо через channel наверх (embedded) — решение принимается `eventSink`-обёрткой в `startApp`.

**`useEmit` → channel routing подменяется через Provider в `startApp`-обвязке.** `EmitProvider` принимает `eventSink` callback; в embedded — `eventSink = channel.send`; в standalone — `eventSink = localBus.dispatch`. HCA-слои используют `useEmit` единообразно, не зная режима. Реализация Provider'а — Phase 1a, **зависимость в `owner-web-core`** (рядом с `createCapsuleApp`). В Phase 1 demo-`hello` шлёт через `channel.send` напрямую — минимальный module с одной кнопкой, не полноценный HCA-app; canon-валидация полного `useEmit → channel` routing'а ждёт Phase 1a backfill (см. risks #7b).

CLI scaffolding (`capsule create-app`) генерит `standalone.ts` по дефолту — это followup в зоне `owner-cli` / `owner-builders`, **не блокирует Phase 1**. В Phase 1 demo-app'ы пишут `standalone.ts` руками.

### 2. Bootstrap — universal lifecycle, named export, structured context {#decision-bootstrap}

Module entry экспозит **named** export `bootstrap`:

```ts
export interface IRemoteBootstrap<Props = Record<string, unknown>, Config = Record<string, unknown>> {
  (root: HTMLElement, ctx: { props: Props; config: Config; channel: IRemoteChannel }): IRemoteDispose;
}
export type IRemoteDispose = () => void;
```

- **Named export, не default.** Default в capsule app'е по конвенции — root Page; смешивать default-export'ы между «здесь живёт Page» и «здесь живёт remote-bootstrap» — путаница. Default-export iframe-shell'ом игнорируется; если `bootstrap` отсутствует — runtime-ошибка с понятным сообщением.
- **Structured context object** (а не `(root, props, channel)` позиционно) — потому что у нас две разные оси входных данных (props + config) + channel. Расширение в будущем (например, `services` с инжектируемыми shared deps) — additive в этот же object без перетряхивания подписи.
- **`dispose` — единственный return.** Reactive updates props/config обрабатываются Solid-reactivity'ью внутри (см. п.4), без `update(newProps)` callback'ов.

`IRemoteChannel` — симметричный module-side handle (counterpart `IRemoteHandle`):

```ts
export interface IRemoteChannel {
  send: (event: string, payload?: unknown) => void;
  request: <T>(event: string, payload?: unknown, timeoutMs?: number) => Promise<IRemoteResponse<T>>;
  on: (event: string, cb: (payload?: unknown) => void) => () => void;
}
```

Эти три типа (`IRemoteBootstrap`, `IRemoteDispose`, `IRemoteChannel`) — **additive** к Phase 0 `src/interfaces.ts`.

### 3. Двухканальный контракт — props vs config {#decision-two-channels}

Host передаёт в embedded app **две независимые сущности**, в двух разных envelope'ах:

| Канал | Что передаёт | Источник на host'е | Доступ внутри app |
|---|---|---|---|
| **props** | Runtime data для конкретного mount: `schema` для рендерера, `center` для карты, `userId` для viewer'а | JSX-attributes `<Remote ...>` минус reserved (`name`/`instanceId`/`config`/`on*`) | bootstrap `ctx.props.*` (reactive accessor — см. п.4) |
| **config** | Ambient app config: `serverUrl`, `authToken`, `theme`, `locale`, feature-flags | `<RemoteProvider config={...}>` ⊕ `modules[name].config` ⊕ `<Remote config={...}>` | `useAppConfig()` внутри HCA-слоёв (merge со standalone-defaults) |

**Merge order для config (canon):**

```
provider.config → modules[name].config → <Remote config={...}>
```

- **Provider.config** — глобальный override для всех embedded apps (например, общая тема, auth-token). Самый низкий приоритет (только default).
- **modules[name].config** — override на уровне типа app'а (геокарта на всех страницах смотрит в default zone X).
- **`<Remote config={...}>`** — per-instance override (твой кейс: «два `<Remote name='geo'>` с разными `serverUrl`»). Самый высокий приоритет.

**Merge применяется host-side** в `RemoteComponent` (`createEffect`); module-side получает finalized snapshot через `__capsule_remote_config__` envelope и хранит его в `configStore`. Никакой merge-логики внутри iframe нет — shell тупой потребитель уже резолвленного config'а. `<Remote config={undefined}>` эквивалентно отсутствию prop'а (provider+module merge применяется как обычно); это **не** «обнулить ambient config».

Под капотом два envelope'а:
- `__capsule_remote_props__` — на initial ready + на каждое изменение props.
- `__capsule_remote_config__` — на initial ready + на каждое изменение config.

Diffing не делаем в Phase 1 — каждый envelope шлёт **полный snapshot** соответствующего объекта. Это premature optimization откладываем (см. п.10 risks).

**Зависимость:** `useAppConfig()` с поддержкой `configOverride` — followup в зоне `owner-web-query` (subpath `/app-config`, см. [[015-remote-modules#decisions]]). В Phase 1 demo-app использует ручной merge внутри `startApp`; canonization `useAppConfig({ override })` — отдельный PR от owner-web-query.

### 4. Reactive props/config — Solid-proxy accessor inside bootstrap {#decision-reactive-proxy}

Iframe-side shell держит **два** Solid `createStore` — для props и для config. На каждый получаемый envelope:

```ts
const [propsStore, setPropsStore] = createStore({});
const [configStore, setConfigStore] = createStore({});

channel.on('__capsule_remote_props__', (next) => setPropsStore(reconcile(next)));
channel.on('__capsule_remote_config__', (next) => setConfigStore(reconcile(next)));
```

В `bootstrap` передаётся **proxy-getter** объект:

```ts
const propsProxy = new Proxy({}, {
  get: (_, key) => propsStore[key as string],
  ownKeys: () => Object.keys(propsStore),
  getOwnPropertyDescriptor: (_, key) => ({ enumerable: true, configurable: true, value: propsStore[key as string] }),
});
// аналогично для configProxy
bootstrap(root, { props: propsProxy, config: configProxy, channel });
```

Модуль внутри `bootstrap` использует `props.schema` / `config.serverUrl` — Solid track'ит property access через store, перерисовка триггерится автоматически. **Это эталонный canonical path для Solid-based remote** — симметрично тому, как Solid сам прокидывает props в `(props) => JSX` компонент.

**Reactive tracking гарантируется только на direct property access** (`props.schemaName`). Enumeration (`Object.keys` / `for...in` / `{...props}` spread / `JSON.stringify`) возвращает snapshot на момент вызова и далее **не реагирует** на изменения store'а. Для динамической итерации module должен явно обернуть в reactive primitive: `createMemo(() => Object.keys(propsStore))` или `<For each={Object.entries(props)}>`. Подводный камень для module-author'ов — документировать в AI-anchor + bootstrap-примере.

Host-side `RemoteComponent` реактивно отправляет snapshot'ы:

```tsx
const RemoteComponent = (props) => {
  // ... ready handshake ...
  createEffect(() => {
    const merged = { ...modules[props.name]?.config, ...props.config };  // per-instance config
    transport.send(envelope('__capsule_remote_config__', merged));
  });
  createEffect(() => {
    const runtime = stripReserved(props);  // не name/instanceId/config/on*
    transport.send(envelope('__capsule_remote_props__', runtime));
  });
};
```

**Не-Solid модули (Phase 2+):** контракт `props`/`config` остаётся, но shell отдаёт **plain snapshot** + `channel.on('__capsule_remote_props__', cb)` для подписки. Phase 1 эксплицитно targets Solid-only (renderer — Solid); non-Solid bootstrap — отдельный followup.

### 5. Auto-subscribe `on*` props — symmetry с domain-пакетами {#decision-on-props}

Host-side `RemoteComponent` фильтрует props по правилу **`on` + UPPERCASE letter**:

```ts
const isEventProp = (k: string) => /^on[A-Z]/.test(k);
// onSelectionChange → eventName 'selectionChange'
// onClick → eventName 'click'
// online → не event prop (lowercase после 'on')
// onclick → не event prop (lowercase, attr-style написание не canon)
```

Regex `^on[A-Z]` гарантирует non-collision с regular props: `online` / `onset` / `onclick` (всё lowercase после `on`) — НЕ matches. Module-author может смело иметь `online: boolean` в props без риска auto-wiring.

Для каждого `on*` prop:

```ts
createEffect(() => {
  const cb = props[propName];
  if (!cb) return;
  const eventName = propName[2].toLowerCase() + propName.slice(3);
  const unsub = transport.onMessage(filterBy({ from: name, fromInstance: instanceId, eventName }, cb));
  onCleanup(unsub);
});
```

Module-side вызывает `channel.send('selectionChange', payload)` — host получает event и вызывает `cb(payload)`. **Это identical к canonical pattern domain-пакетов** ([[041-composition-distribution-model|ADR 041]] `useEmit`): consumer пишет `<Remote onSelectionChange={cb}>` точно так же, как пишет `<Tables.DataTable onRowClick={cb}>`.

Convention для eventName — **camelCase** (`selectionChange`), потому что:
- совпадает с тем как `useEmit('selectionChange', payload)` вызывается в domain-пакетах,
- type-safety будущего manifest codegen (Phase 4) совпадает на обоих концах,
- kebab-case (`selection-change`) требовал бы конверсии на двух концах — лишний source-of-bugs.

Type-safety этих cb остаётся `(payload: unknown) => void` до Phase 4 (manifest typing генерит `.d.ts` со shape всех событий). В Phase 1 — runtime-only.

### 6. Reserved props (host-side filter contract) {#decision-reserved-props}

`RemoteComponent` различает четыре класса входных props:

| Class | Pattern | Handled by | Forwarded to iframe |
|---|---|---|---|
| **System** | `name`, `instanceId`, `fallback` | host-side wire | нет — внутренние |
| **Config** | `config` | host-side merge + envelope | да — через `__capsule_remote_config__` |
| **Events** | `on[A-Z]*` | host-side `transport.onMessage` subscription | нет — host listens, module sends |
| **Runtime props** | всё остальное | host-side envelope | да — через `__capsule_remote_props__` |
| **children** (JSX-composition) | `children` | TS-level ban в Phase 1 | **не поддерживается** — composition across frame boundary отдельный ADR |

Reserved name'а **зафиксированы каноном**. Consumer не может передать `<Remote name="foo" config="bar">` со смыслом «config — обычный prop». Это документируется в AI-anchor + проверяется в типах.

**`children` в Phase 1 не поддерживаются.** Composition `<Remote name="x"><span>...</span></Remote>` требует slot-bridge / portal-across-frame механизма (передача JSX-узла host'а в iframe-DOM с обратной reactivity). Это отдельный архитектурный вопрос уровня DnD-через-iframe (см. risks #3), мотивируется по мере появления use-case'ов. В Phase 1 — TypeScript-уровневый ban: `IRemoteComponentProps` не включает `children?: JSX.Element`. Runtime — silent ignore если передан через any-cast.

**Reserved event-name namespace `__capsule_*`.** Префикс зарезервирован за shell-internal envelope'ами (`__capsule_remote_props__`, `__capsule_remote_config__`, `__capsule_remote_ready__`, ...). `channel.on('__capsule_*', ...)` / `channel.send('__capsule_*', ...)` из пользовательского кода — runtime warning + no-op (предотвращает silent collision с shell handler'ами). Documented в AI-anchor; в Phase 4 манifest validation проверит схему events на этот префикс.

### 7. Demo — два полноценных capsule app'а, два dev-server'а {#decision-demo}

Phase 1 demo состоит из **двух** apps, созданных через CLI:

- **`apps/remote-host`** — host: `<RemoteProvider modules={[{ name: 'hello', url: helloUrl(), config: {...} }]}>` + `<Remote name="hello" greeting={signal()} onClicked={cb} />`.
- **`apps/remote-hello`** — embedded: обычный capsule app + `src/standalone.ts` с `export const bootstrap`. Manifest `capsule.manifest.json` пишется руками в `public/` (vite-plugin Phase 4 — followup).

Demo flow:
- `cd apps/remote-hello && pnpm dev` → :3001, работает как standalone app.
- `cd apps/remote-host && pnpm dev` → :3000, содержит iframe на :3001.
- `helloUrl()` в host: `dev ? 'http://localhost:3001' : '/remote-hello'` — dev-mode указывает на live dev-server (HMR работает внутри iframe), prod-mode — на built артефакт.

**Validation checklist** для Phase 1 acceptance:
- Host body красит фон **синим**, hello — **красным**. Iframe-контент красный → подтверждает CSS изоляцию.
- `<button>` внутри hello → click внутри iframe → `channel.send('clicked', ts)` → host получает через `onClicked` prop. Подтверждает event-delegation работает внутри own-root + auto-subscribe `on*`.
- `<Remote greeting={signal()}>` — изменение signal'а на host'е → hello перерисовывается без manual `.send('greeting', ...)`. Подтверждает reactive props.
- `<RemoteProvider config={{ theme: signal() }}>` — переключение темы → hello перекрашивается. Подтверждает reactive config + ambient channel.
- Два instance'а с **explicit `instanceId`** — `<Remote name="hello" instanceId="a" config={{ apiUrl: 'A' }}>` + `<Remote name="hello" instanceId="b" config={{ apiUrl: 'B' }}>` — каждый видит свой `apiUrl` через `useAppConfig()` (в Phase 1 — через **manual merge внутри `startApp`** из `configOverride` параметра bootstrap'а; canonical `useAppConfig({ override })` API — Phase 1a от `owner-web-query`). Подтверждает per-instance config override (твой главный use-case). Explicit `instanceId` обязателен для этого check'а — без него auto-id (`createUniqueId()`) делает instance'ы неадресуемыми через `remote(name, id)`.
- Same app на :3001 без iframe — работает идентично embedded-режиму (модуло host-injected config). Подтверждает symmetry.

Без покрытия всех шести checks Phase 1 acceptance не закрыт.

### 8. Pluggable transport array — phase 1 готов к Phase 2 без переделок {#decision-transport-array}

Phase 1 — single `IframeTransport`, но архитектурно — array через resolver:

```ts
class RemoteProvider {
  private transports: ITransport[] = [new IframeTransport()];  // Phase 1: single entry, but array shape
  resolveTransport(target: { isStandalone, sameOrigin, ... }) {
    return this.transports.find((t) => t.canReach(target));
  }
}
```

`canReach` уже в Phase 0 `ITransport` контракте. Phase 2 добавит `BroadcastChannelTransport` и `PostMessageStandaloneTransport` в этот array без изменения consumer-кода (`<Remote>` / `useRemote()` API не меняется). `openStandalone()` в Phase 1 — `console.warn('Phase 2 feature') + no-op`, как в брифе.

**Acceptance:** explicit assertion в OWNERSHIP'е — «transports — array, resolved via `canReach`, даже если в Phase 1 ровно один элемент». Это страховка против хардкода single-transport, которая видна при code-review.

## Альтернативы {#alternatives}

### A. Один канал props, без отдельного config {#alt-a}

Передавать всё через `<Remote>` props — host пишет `<Remote name="geo" serverUrl="...">`. Внутри app props.serverUrl читается напрямую.

Минусы:
- **Симметрия со standalone ломается.** В standalone app читает `useAppConfig().serverUrl`; в embedded — `props.serverUrl`. Разные пути → код HCA-слоёв расходится.
- **Manifest-типизация теряет смысл.** Props-схема должна описывать «что host передаёт в этот mount»; смешивать туда «как app сконфигурирован вообще» (env-config, theme, locale) — раздувает manifest и мешает downstream-кейсам (например, type-checking renderer schema vs theme tokens).
- **Per-instance override автоматически возможен** (это плюс), но у provider-level дефолта (общая тема всем) нет естественного места — приходится тиражировать через map.

Отвергнуто — экономия одной примитивной абстракции не стоит сломанной симметрии.

### B. Single envelope с разделом «system» vs «user» {#alt-b}

Один envelope `__capsule_remote_state__` со shape `{ props: {...}, config: {...} }`. Внутри shell разбирает.

Минусы:
- Любое изменение props триггерит ship всего envelope (включая большой config) и наоборот. Two-store separation в Phase 1 — простое и дешёвое; объединение — premature.
- Manifest-типизация (Phase 4) для props/config разделена — codegen должен ходить в один shape и резать. Сложнее, не проще.

Отвергнуто — separation бесплатна.

### C. Bootstrap получает `update(newProps)` callback вместо reactive proxy {#alt-c}

```ts
export const bootstrap = (root, { props: initialProps, channel }) => {
  let currentProps = initialProps;
  channel.on('__props__', (next) => { currentProps = next; rerender(); });
  return dispose;
};
```

Минусы:
- **Не Solid-friendly.** Модуль должен сам подписаться, сам пересоздать render — Solid примитивы (signal/store) делают это бесплатно при reactive accessor подходе.
- Каждый module-author изобретает свой `rerender()`. Boilerplate, ошибки.

Отвергнуто — proxy-accessor (вариант B в discussion summary) каноничнее.

### D. Initial-only props + manual `.send()` для updates (текущий бриф до правок) {#alt-d}

Соответствует MF-reference (PROTEI) — initial config через query-string, updates через WebSocket.

Минусы — см. Pain 3. Renderer-followup → boilerplate per consumer; обещание «как domain-пакет» нарушено.

Отвергнуто — стоимость add-later >> include-now.

### E. App знает что embedded, через `useRemoteHostContext()` {#alt-e}

Embedded app получает явный hook `useRemoteHostContext()` через который читает host-injected данные (config, ambient state). Standalone app этот hook не использует.

Минусы:
- **Asymmetry в коде HCA-слоёв.** `if (isEmbedded) { ... }` — два пути для одного функционала.
- Дрейф между режимами неизбежен. Фича работает embedded — не тестируется standalone, и наоборот.

Отвергнуто — главная ценность app-as-remote именно в исчезновении такого if'а.

### F. Отложить app-as-remote до Phase 2; в Phase 1 — generic module loader {#alt-f}

Phase 1 — просто `<Remote>` грузит произвольный bundle с `bootstrap`-exports'ом; никаких гарантий симметрии, никакого config-канала. App-as-remote — Phase 2 как «надстройка».

Минусы:
- API форма влияет на module entry contract (нужен `config` в `bootstrap` сигнатуре). Менять подпись в Phase 2 = breaking-change, переделывать demo и renderer-followup.
- Renderer-as-remote (главный мотиватор Phase 1) уже требует config (theme tokens host'а → renderer должен показать те же токены). Без config-канала это hack-через-props.

Отвергнуто — задержка Phase 2 не оправдывает потерю canonical form в Phase 1.

## Последствия {#consequences}

### Положительные {#consequences-positive}

- **Один code path для app'а** — HCA-слои identical между standalone и embedded. Тесты, доки, эталоны — общие.
- **Renderer-as-remote естественен.** Studio передаёт `<Remote name="renderer" schema={editorSchema()} config={{ theme: studioTheme() }}>` — обе оси работают через canonical-каналы, без host-specific обвязок.
- **Multi-tenant scenarios встроены.** `<Remote name="geo" config={{ region: 'eu' }}>` + `<Remote name="geo" config={{ region: 'us' }}>` — два инстанса одного app, разный config, чистый код. Целевой кейс user'а покрыт без специальной логики.
- **Domain-пакеты и remote-app'ы выглядят одинаково.** Consumer пишет `<Tables.DataTable onRowClick={cb}>` или `<Remote name="x" onSomething={cb}>` — одна ментальная модель. Учить два API не нужно.
- **Foundation готов к Phase 2-5.** Resolver-array, addtive types, separated channels — расширения добавляются без переделок.

### Отрицательные {#consequences-negative}

- **Phase 1 сложнее, чем «iframe + initial props».** ~3 дополнительных дня имплементации на host-side (createEffect для props/config + on*-filtering + proxy-accessor в shell). Stoimost' приемлема против add-later cost'а.
- **Shell внутри iframe несёт больше логики** (два store'а, два envelope handler'а, proxy-фабрика, dispatcher с фильтром, pending Map для request/response, ready-handshake state). Inline srcdoc-template на эту массу — за пределами удобного. **Phase 1 default — `boot.js` как dist-asset web-remote'а**, импортируется через `import bootUrl from '@capsuletech/web-remote/boot.js?url'` (Vite-resolved), URL инжектится в короткий srcdoc как `<script src="${bootUrl}">`. Преимущества: debuggable URL в DevTools, type-checked на build'е web-remote'а, HMR при разработке самого shell'а, cache'ится между instance'ами (один HTTP-запрос на N iframe'ов), не съедает символьный budget JSON-escape. srcdoc остаётся только для bootstrap-параметров (NAME / INSTANCE_ID / SESSION_ID / ENTRY).
- **Couples bootstrap signature к Solid Reactivity.** Non-Solid module-authors в Phase 2+ получат plain-snapshot путь — это сужает «universal» обещание (Phase 1 Solid-only по факту). Документировать честно.
- **Reactive snapshot envelope — полный, не дифф.** Для крупных props (renderer schema) — потенциально ~MB/s трафик между host и iframe при активной правке. Phase 2 optimization (см. известные свойства).

### Известные свойства / риски {#consequences-properties}

Не блокеры Phase 1, но фиксируются как технический долг или явные ограничения:

1. **Reactive props envelope shipping** — full snapshot на каждый change. Для renderer-схемы при активном редактировании можно увидеть пиковую нагрузку. Phase 2+ optimization — diff-shipping (через `solid-js/store`-style key reconcile). Отслеживать через memory `feedback_root_cause_before_fix` — не лечить симптом до появления реальной метрики.

2. **`sandbox="allow-scripts allow-same-origin"` не security boundary.** Iframe с этой парой токенов видит parent cookies/localStorage. Для same-origin trusted capsule app'ов — OK; для untrusted third-party модулей — нужен stricter sandbox + cross-origin (отдельный transport-variant Phase 3+). Документируется в OWNERSHIP.md.

3. **DnD через iframe boundary** — pointer events не пересекают frame. Studio palette drag → renderer canvas drop **не работает** в Phase 1 архитектуре. Это **следующий архитектурный ADR** (pointer-forwarding via channel или host-overlay drop-zone), эскалируется на architect, не делегируется в owner-web-remote.

4. **Type-safety of `on*` events** — `(payload: unknown) => void` до Phase 4 (manifest codegen). Consumer'ы пишут без типов, runtime-only.

5. **Asset resolution inside entry bundle** — `import './styles.css'` внутри remote-entry резолвится относительно entry URL'а. Vite emit'ит относительные пути; для dev (через :3001 dev-server) — работает; для prod-built нужен правильный `base` в vite config модуля. Проверяется через demo (валидируется на dev + на preview).

6. **HMR через iframe boundary** — работает при dev-mode pointing на live dev-server (`url: 'http://localhost:3001'`); prod-built не пере-HMR'ится (это вообще не цель). Demo показывает оба сценария.

7. **`useAppConfig({ override })` зависимость.** Канонический merge override-логики живёт в `@capsuletech/web-query/app-config`. Owner-web-query — followup; до этого demo делает manual merge внутри `startApp`. Зафиксировать в OWNERSHIP.md `@capsuletech/web-remote` как dependency-readiness checkpoint.

7a. **`createCapsuleApp` canonical helper.** Симметрия standalone/embedded требует общего bootstrap-кода (Solid root + BaseProviders + RouterProvider + EmitProvider + IAppConfig read). В Phase 1 demo-apps пишут `startApp` руками per-app; Phase 1a canonization — `owner-web-core` добавляет helper в `@capsuletech/web-core/bootstrap` subpath. Без этого второй remote-capable app получит копипасту bootstrap-обвязки → дрейф через год.

7b. **`EmitProvider` (`useEmit` channel routing).** Без него Решение 5 (`<Remote onClicked={cb}>`) работает только с module'ами явно вызывающими `channel.send('clicked', ...)`; HCA-app использующий канонический `useEmit('clicked', payload)` в Controller/Feature не маршрутизируется наверх через channel. Phase 1a в зоне `owner-web-core`, рядом с (7a) `createCapsuleApp`. В Phase 1 demo-`hello` — минимальный module (одна кнопка, direct `channel.send`), не валидирует HCA-полный путь; canon-валидация ждёт Phase 1a backfill.

8. **Standalone-only капсул-апы без `bootstrap`** — нормальное состояние. App становится embedded-capable когда добавляет `src/standalone.ts`. CLI scaffolding (`capsule create-app`) генерит файл по дефолту, ручную правку существующих apps делает их author (или owner-cli через codemod).

9. **Serialization boundary — structured-clone.** `__capsule_remote_props__` / `__capsule_remote_config__` envelope'ы клонируются через `postMessage` (structured-clone algorithm). Переживают: примитивы, plain objects, arrays, `Date`, `RegExp`, `TypedArray`, `Map`, `Set`, `ArrayBuffer`. **НЕ переживают (silent dropping без warning'а): функции, Symbols, DOM nodes, class instances с приватными полями / accessor-свойствами.** Module-author попробует прокинуть `<Remote computed={() => x()} schema={signal()}>` — `signal()` клонируется как plain object (ок), `() => x()` теряется без следа. **Canonical путь для callback'ов = `on*` props** (Решение 5), не regular props. Документировать в AI-anchor; в Phase 4 manifest schema validation проверит props-schema на наличие unserializable types и выдаст build-time error.

### Migration / Roadmap {#consequences-roadmap}

ADR-015 roadmap (Phase 0-5) дополняется консумерскими гарантиями этого ADR'а:

- **Phase 1 (web-remote + first consumer):**
  - IframeTransport + Provider + Remote + useRemote (см. брифе `web-remote-phase1-renderer-mvp.md`).
  - Additive types: `IRemoteBootstrap`, `IRemoteDispose`, `IRemoteChannel` в `src/interfaces.ts`.
  - Two-channel envelope contract (`__capsule_remote_props__`, `__capsule_remote_config__`).
  - Reactive proxy-accessor для props и config.
  - Host-side auto-subscribe `on*` props.
  - Demo: `apps/remote-host` + `apps/remote-hello`, два dev-server'а, six validation checks.

- **Phase 1a (followup, не блокирует Phase 1 merge):**
  - `createCapsuleApp` helper в `@capsuletech/web-core/bootstrap` subpath (owner-web-core) — снимает копипасту `startApp` в apps.
  - `EmitProvider` для `useEmit` → channel routing (owner-web-core, рядом с createCapsuleApp).
  - `capsule create-app` генерит `src/standalone.ts` шаблон (owner-cli + owner-builders).
  - `useAppConfig({ override })` canonical API (owner-web-query, `/app-config` subpath).
  - **Renderer-as-remote landing — ЗАВИСИТ от DnD-через-iframe решения.** Studio creator-mode без drag-from-palette → drop-into-canvas = неработающий creator (fundamental gesture). До landing'а renderer-as-remote требуется **либо** отдельный архитектурный ADR (pointer-forwarding host → iframe через channel; e.g., host capture'ит pointermove + posts iframe-relative coords; iframe-side synthesizes PointerEvent), **либо** host-overlay drop-zone workaround (host рисует transparent drop-overlay поверх iframe, события из overlay сериализуются → channel → iframe applies). Эскалируется на architect-зону при landing'е Phase 1, **не делегируется в owner-web-renderer**. После решения: `@capsuletech/web-renderer` экспозит `bootstrap()` (owner-web-renderer); studio creator-mode переезжает на `<Remote name="renderer">` (owner-web-studio). Координирует architect через двух owner'ов.

- **Phase 2** (per ADR-015 amended):
  - `BroadcastChannelTransport` + standalone window (`router.openInWindow`, owner-web-router).
  - Resolver array содержит два transport'а.

- **Phase 3+** — как в ADR-015 (cross-origin postMessage, socket, manifest plugin, HCA-injection compliance).

- **Phase N (optimization, не зарезервировано):**
  - Diff-shipping для props/config envelopes (если метрика покажет реальную необходимость).
  - Non-Solid bootstrap path (plain-snapshot + manual on-update) — когда появится non-Solid module-author.
  - Stricter sandbox transport variant — когда появится untrusted third-party use-case.

## Phase 1 Acceptance gates {#phase1-acceptance}

Этот ADR определяет acceptance для Phase 1 имплементации:

- ✅ `packages/web/runtime/remote/src/interfaces.ts` — additive types `IRemoteBootstrap`, `IRemoteDispose`, `IRemoteChannel`; расширение `IRemoteModuleConfig` с опциональным `config?: Record<string, unknown>`; расширение `IRemoteComponentProps` с reserved `config?: Record<string, unknown>` и `on*` дискриминацией.
- ✅ `config` shape в Phase 1 — `Record<string, unknown>` (untyped). Runtime validation добавляется в Phase 4 через manifest codegen (zod-to-json-schema + TS generated types).
- ✅ `RemoteProvider` принимает `config?` prop; merge order (provider → module → instance) реализован **host-side в `RemoteComponent`** и unit-протестирован. `<Remote config={undefined}>` ≡ отсутствие prop'а.
- ✅ `RemoteComponent` различает четыре класса входных props (System / Config / Events / Runtime; `children` — TS-level ban); reserved name'а недопустимы как runtime props.
- ✅ `RemoteComponent` createEffect-шлёт `__capsule_remote_props__` и `__capsule_remote_config__` envelope'ы реактивно (включая initial на ready handshake).
- ✅ `RemoteComponent` host-side wrap-ит `on*` props через `transport.onMessage` (фильтр `^on[A-Z]`).
- ✅ Iframe-shell — `boot.js` как dist-asset (`@capsuletech/web-remote/boot.js?url`) + короткий srcdoc inject'ит bootstrap-параметры; держит два Solid store'а; передаёт в `bootstrap` proxy-accessor объекты для props и config; reserved namespace `__capsule_*` для shell-internal events (user `channel.on('__capsule_*')` → warn + no-op).
- ✅ `useRemote().remote(name).openStandalone({})` — не throw'ает, логирует `console.warn('[capsule/remote] openStandalone — Phase 2 feature')`, возвращает `undefined`. Страховка от случайного `throw new Error('not implemented')`.
- ✅ Transports — array shape (`transports: ITransport[]`), resolved через `canReach()`, даже если в Phase 1 ровно один элемент (`new IframeTransport()`). Single-transport hardcode запрещён.
- ✅ Six validation checks demo пройдены в реальном браузере (см. п.7).
- ✅ `pnpm --filter @capsuletech/web-remote build` + `test` + `typecheck` — green; `pnpm nx affected -t test build` — green pre-push.
- ✅ ADR-053 landed; ADR-015 status переходит в `partially-implemented` после Phase 1 merge.

## Связанное {#related}

- [[015-remote-modules|ADR 015]] — транспортный контракт + pluggable transports (foundation для этого ADR'а).
- [[041-composition-distribution-model|ADR 041]] — domain-пакеты, `useEmit` (canonical event channel, который mimics `on*` props в этом ADR'е).
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] — frontend zones (web-remote — runtime-zone, не studio/domain).
- [[003-router-context-based|ADR 003]] — Router (`openInWindow` метод появится в Phase 2 для standalone-режима).
- [[004-compliance-linter|ADR 004]] — линтер расширится правилом про `@capsuletech/web-remote` (Phase 5: запрещён в Controller/Entity, разрешён в Feature/Widget).
- `docs/_meta/briefs/web-remote-phase1-renderer-mvp.md` — implementation brief (consumes this ADR + ADR-015 amendment).
- `docs/_meta/briefs/_discussion-web-remote-phase1-2026-06-19.md` — discussion summary, которая привела к этому ADR.
- `docs/_meta/briefs/web-ui-mount-provider-revert.md` — parallel revert (отказ от kit-уровня workaround'а для iframe popover'ов; мотивирует переход на own-root архитектуру).
- memory `feedback_canon_modules_no_crutches` — §0: эталон = код + tests + docs + реальный consumer; renderer = первый consumer, валидирующий API.
- memory `feedback_packages_adapt_to_architecture` — symmetry между standalone и embedded — это адаптация пакета (web-remote) под архитектуру app'а, не наоборот.
- memory `project_renderer_convergence` — рендерер как remote — естественное продолжение convergence (UI собирается через schema; embedded runtime — следующий шаг).
