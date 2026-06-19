---
title: Discussion summary — web-remote Phase 1 (architect ↔ user, 2026-06-19)
status: draft / for second-opinion
related-brief: web-remote-phase1-renderer-mvp.md
related-adr: docs/01-architecture/adr/015-remote-modules.md (amendment 2026-06-19)
---

# Контекст обсуждения

Architect (главный) + user уточняли концепцию `@capsuletech/web-remote` перед делегированием в owner-web-remote. Текущий бриф (`web-remote-phase1-renderer-mvp.md`) описывает iframe-transport + `bootstrap()` lifecycle + ready-handshake с initial props. После прочтения брифа + ADR-015 + amendment 2026-06-19 у architect'а остались уточняющие вопросы. User дополнил картину — ниже summary концепции и **расхождения / open questions** vs текущий бриф.

# Концепция (от user'а) — фиксируем как anchor

**Remote = универсальная обёртка которая делает любой capsule app подключаемым как модуль.**

- Любой `apps/<name>` может работать в двух режимах: standalone (как сейчас, свой dev/build/deploy) **или** подключённым внутрь другого app как `<Remote name="x">`.
- App изнутри не знает в каком режиме работает — есть единый entry-контракт (`bootstrap(root, props, channel)`), дальше живёт как обычный app.
- Симметрия с `packages/web/domain/*`: тот же pattern «props вниз, named events вверх», но domain — узконаправленные пакеты без своего root'а, а remote-app — полноценный app со своим root'ом.
- **Магия — на уровне remote-обёртки** (host-side `<Remote>` + iframe-shell). Не на уровне app изнутри и не на уровне consumer-кода в host'е.
- С точки зрения host'а `<Remote name="x" prop={...} onEvent={cb}>` должен ощущаться **точно так же** как domain-пакет. Иначе симметрия сломана и появляется второй API стиль.
- Same-origin в большинстве сценариев → postMessage достаточен. Cross-origin / socket — потом.
- Возможность вывести из embedded в standalone window — **API общения не меняется**. Pluggable transport под капотом (это уже в Phase 0 контракте через `canReach`).
- Закладываем хорошую базу для расширения, но Phase 1 = база + проверка, дальше обвешиваемся.

# Расхождения и уточнения vs текущий бриф

## 1. Reactive props — НЕ initial-only

**Что в брифе (Phase 1.e):**
> Реактивные prop-обновления (props на `<Remote>` после mount'а) **в Phase 1 не делаются автоматически** — initial props один раз на ready handshake; runtime-апдейты host'ы шлют через `useRemote().remote(name).send(...)`.

**Что следует из концепции user'а:**
Если remote должен работать «как domain-пакет», то `<Remote schema={signal()}>` обязан **реагировать на изменение `signal()`** без ручного `remote('x').send(...)`. Иначе:
- Каждый consumer пишет свой `createEffect(() => remote('x').send('props', latestProps))` — это boilerplate которого у domain-пакетов нет.
- Renderer-followup упрётся сразу: studio передаёт schema через prop, рендерер должен подхватить — без auto-reactive props renderer не «как domain-пакет», а особый случай.
- Добавлять реактивные props позже = переделывать всех consumer'ов.

**Предлагается включить в Phase 1:**
- Host-side `RemoteComponent` делает `createEffect(() => props.<all-non-internal>)` и шлёт envelope `eventName: '__capsule_remote_props__'` с **полным snapshot'ом props** при каждом изменении.
- Initial props — тот же envelope, отправляется один раз на ready-handshake.
- Iframe-side shell получает `__capsule_remote_props__` → передаёт в reactive store, передаёт в `bootstrap` через прокси-getter или через перезапуск render'а с новыми props.
- **Полная замена**, не диффы — диффы это premature optimization для Phase 1.

**Open question:** как iframe-side применяет props к уже запущенному `bootstrap()`? Варианты:
- (a) `bootstrap` возвращает `{ dispose, update(newProps) }` вместо просто `dispose` — тогда `IRemoteBootstrap` контракт меняется (всё ещё additive, но лишнее усложнение).
- (b) iframe-shell держит свой Solid reactive store с props, передаёт в `bootstrap` как **getter-объект** (`props.greeting` — это accessor). Модуль автоматически реагирует через Solid reactivity. **Это эталонный canonical путь для Solid-based remote.**
- (c) iframe-shell на каждое изменение props делает `dispose()` + повторный `render()`. Просто, но дорого + теряется state.
- **Предпочтительно (b)** — bootstrap получает proxied props object с reactive accessor'ами. Симметрично тому как Solid сам прокидывает props в компоненты.

## 2. Auto-subscribe `on*` props — host-side wrap

**Что в брифе:**
Не упомянуто. Подразумевается consumer пишет `useRemote().remote('x').on('event', cb)` руками.

**Что следует из концепции user'а:**
В domain-пакетах host пишет `<Pkg.Thing onClicked={cb}>` — `useEmit` в пакете маршрутизирует событие наверх. Чтобы remote был «как domain», `<Remote name="x" onClicked={cb}>` должен **автоматически** превратиться в `channel.on('clicked', cb)` под капотом.

**Предлагается включить в Phase 1:**
- Host-side `RemoteComponent` фильтрует `props` — те что начинаются с `on` + следующая буква uppercase (`onSubmit`, `onSelectionChange`) → расцениваются как **event handlers**, не как regular props.
- Для каждого `on*` prop делается `createEffect` который привязывает / отвязывает `host-transport.onMessage` фильтр по `(from=name, fromInstance=instanceId, eventName=kebab-or-camel(stripOn(propName)))`.
- Не-`on*` props идут как regular props через `__capsule_remote_props__` (см. п.1).
- Convention для eventName: `onSelectionChange` → `selection-change` (kebab) или `selectionChange` (camel)? **Предлагается camelCase** (`selectionChange`) — совпадает с тем как domain-пакеты вызывают `emit('selectionChange', payload)`.

**Без этого** demo не доказывает главную ценность remote — он становится «iframe + ручной message bus», а не «app как domain-пакет».

## 3. Demo — два полноценных capsule app'а (через CLI)

**Что в брифе (Phase 1.h):**
> Создать `apps/remote-demo/` через CLI. Remote-модуль `apps/remote-hello/` — builds в `dist/remote/` с `capsule.manifest.json` + ESM entry, экспозит `bootstrap(root, props, channel)`.

Хостинг `apps/remote-hello/dist/remote/*` на URL `/remote-hello` не специфицирован.

**Что следует из концепции user'а:**
App = standalone сам по себе. Значит `apps/remote-hello` запускается своим `pnpm dev` на своём порту, demo-host `apps/remote-demo` коннектится по `url: 'http://localhost:<port>'`. Это:
- Согласуется с «app работает и как standalone, и как remote» — в demo показываем оба режима сразу (`localhost:3001` сам по себе vs `localhost:3000` с iframe'ом внутри).
- В prod каждый app деплоится независимо, manifest читается с его origin'а.
- Никакого public/-инжекта или копирования dist'ов.

**Предлагается зафиксировать в брифе:**
- `apps/remote-hello` — обычный capsule app + дополнительный entry `src/standalone.ts` с `export const bootstrap`.
- Manifest `capsule.manifest.json` пишется руками (или статикой в `public/`), пока vite-plugin (Phase 4 owner-builders) не появится.
- Demo flow в README app'а: открой :3001 — он работает как обычный app; открой :3000 — он же подгружен внутри iframe.

## 4. `bootstrap` — named export, не default

**Что в брифе (Phase 1.c):**
Iframe-shell делает `import(ENTRY).then(({ bootstrap }) => ...)` — то есть **named export**. Но в Phase 1.a contracts описаны через `IRemoteBootstrap` без явного указания «named only, not default».

**Зафиксировать явно:**
- Module entry MUST export `bootstrap` named export (`export const bootstrap: IRemoteBootstrap = ...`).
- Default export игнорируется (или ошибка с понятным сообщением).
- В AI-anchor (`docs/_meta/web-remote.md`) и в OWNERSHIP.md публичном API явно прописать.

## 5. App-as-remote scaffolding — followup, не Phase 1

**Что в брифе:**
Не упомянуто.

**Что следует из концепции user'а:**
Чтобы любой `apps/<name>` мог стать remote'ом, в CLI `capsule create-app` (или флагом) должен генериться `src/standalone.ts` + manifest emit в build'е. В Phase 1 — это **followup** в зоне owner-builders / owner-cli, **не блокирующий Phase 1 acceptance**. Demo app пишет `standalone.ts` руками.

**Зафиксировать в Followups секции брифа.**

## 6. Pluggable transport API готов под standalone — verify, не реализовывать

**Что в брифе:**
`openStandalone` = `console.warn` + no-op. Корректно.

**Что нужно проверить (acceptance):**
`RemoteProvider` инстанцирует **один** `IframeTransport`, но architecture **должна** допускать резолвер `[IframeTransport, BroadcastChannelTransport, PostMessageTransport]` в будущем — `canReach({ isStandalone, sameOrigin })` уже используется. В Phase 1 резолвер вырожденный (один transport), но не хардкод. Это **уже подразумевается** Phase 0 контрактом, но прописать в acceptance явно: «transport-array, не одиночный экземпляр, даже если в array один элемент».

## 7. Что в брифе остаётся без изменений

- iframe srcdoc-shell (owned by web-remote) — да.
- `sandbox="allow-scripts allow-same-origin"` — да, оба нужны (без второго — opaque-origin → postMessage не парится).
- Iframe registry внутри `IframeTransport` — да.
- Additive types `IRemoteBootstrap` / `IRemoteChannel` / `IRemoteDispose` — да.
- Reactive `module.url` change → iframe ремоунтится — да.
- `openStandalone` no-op + console.warn — да.
- ADR-015 amendment 2026-06-19 — landed (architect's zone).
- Workflow: ветка `feat/web-remote-phase1`, commit-only без push, conv-commits.

# Summary для второго мнения

Главный вопрос к second-opinion агенту:

**Согласен ли с включением в Phase 1 (а не followup'ом):**
1. **Reactive props** — host-side `createEffect` + полная замена snapshot'а props в iframe; bootstrap получает Solid-reactive proxy объект.
2. **Auto-subscribe `on*` props** — `<Remote onX={cb}>` = `channel.on('x', cb)` под капотом, без ручного `remote('x').on(...)`.
3. **Demo = 2 capsule app'а через CLI с двумя dev-server'ами** на разных портах (вместо public-inject).

Альтернатива — оставить как в брифе (initial-only props, ручной `.on()`, hosting не специфицирован). Phase 1 быстрее закрывается, но:
- Renderer-followup упирается в boilerplate per consumer.
- Demo не доказывает «remote = как domain».
- Все consumer'ы переделываются когда reactive/auto-on добавится во второй фазе.

Architect's lean — **включить п.1 и п.2 в Phase 1**, иначе foundation не валидирует ключевую ценность. Стоимость доп. работы умеренная (createEffect + filter on*-props + envelope routing), сложность в **передаче reactive props внутрь bootstrap'а** (см. open question в п.1 — variant b с proxied accessor'ами).

# Расхождения которые НЕ требуют решения

- `bootstrap` named-export — фиксируем в AI-anchor, не вопрос.
- App-as-remote CLI scaffolding — followup, owner-builders/cli.
- Transport-array resolver — уже подразумевается Phase 0, явно прописать в acceptance.

# Что architect делает дальше (после возврата user'а с обсуждением)

1. Если п.1/2/3 = «да» → добавить дельту в `web-remote-phase1-renderer-mvp.md` (Phase 1.e расширить под reactive props; новая Phase 1.j «auto-subscribe on* props»; Phase 1.h уточнить два-app-flow).
2. Делегировать в owner-web-remote через `Agent(subagent_type='owner-web-remote', prompt=brief-path + delta)`.
3. Coordinate Phase 1 acceptance через gate-3 verify (architect: `pnpm --filter @capsuletech/web-remote build+test+typecheck` + demo smoke в браузере).
