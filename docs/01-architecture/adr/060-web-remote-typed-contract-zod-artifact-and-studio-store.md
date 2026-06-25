---
tags: [hca, adr, proposed, web-remote, contract, zod, codegen, studio, module-federation]
status: proposed
date: 2026-06-25
last_updated: 2026-06-25
extends:
  - 059-web-remote-app-mode-iframe-src-and-config-override
  - 058-web-remote-message-only-mode-by-intent
  - 053-app-as-remote-symmetry-and-config-channel
  - 033-package-registration
  - 013-explicit-define-app-config
  - 015-remote-modules
---

> [!warning] Status: proposed (2026-06-25)
> Направление согласовано в дизайн-сессии + сделан research-homework (MF dts / ts-rest / Zodios /
> tRPC / typed-postMessage). НО перед Phase 1 нужен **code-POC** (Phase 0): эмит контракт-артефакта
> из Zod + рендер контракта через zod-интроспекцию + vendoring-спайк. Канон `feedback_homework_before_adr`:
> ADR на механизме без feasibility-POC = риск. Принимаем (`accepted`) только после Phase 0.

# ADR 060 — web-remote: типизированный контракт ремоута (Zod public-interface → vendored артефакт) + root-event-bus мост + studio-store

## Контекст {#context}

[[059-web-remote-app-mode-iframe-src-and-config-override|ADR 059]] зафиксировал app-режим как
self-contained iframe-src + config-override (host→app) и оставил **открытым** vector app→host
событий и **чтение** host-данных из app-кода. Дизайн-сессия 2026-06-25 это закрыла, и по ходу
вскрылись три вещи, ломающие наивные подходы:

1. **`useEmit`-в-app и `useInputs`-в-app — костыли.** `useEmit` — пакетный хук (компонент ПАКЕТА
   стреляет в Controller/Feature аппа); app не пакет. `useInputs` зашивает в app «я ремоут».
   Оба нарушают канон «ремоут = обвес, app не знает что встроен» ([[059...|ADR 059]] принцип 3).
2. **Дефолтный «форвардить ВСЕ useEmit хосту» — утечка** (хост фильтрует по `on*`, но через
   границу летит всё внутреннее). Эту инфру придержали в сессии 2026-06-24 именно из-за этого.
3. **Типизация границы между независимыми аппами** — отдельная проблема (host↔remote — разные
   сборки/реалмы). Research (см. §research) показал: live-fetch типов на билде (как MF dts)
   **хрупкий** (MF гейтит fetch в prod/CI — issue module-federation/core#3573; оффлайн ломает билд).

Параллельно: web-studio уже имеет «стор компонентов» (`/manifests` — реестр спецификаций,
`/inspector` — generic-рендер спеки, web-renderer — UI по JSON-схеме). Возникает вопрос: можно ли
ремоут показать в сторе как самоописываемый итем с его контрактом?

## Принципы {#принципы}

1. **Remote = мост на корневую шину аппа, НЕ API внутри аппа.** App — чистое standalone HCA;
   remote-слой садится на корневой Feature и бриджит его event-bus к host-postMessage. App-код
   идентичен standalone vs embedded.
2. **Контракт = ПУБЛИЧНЫЙ ИНТЕРФЕЙС аппа, агностичный к способу подключения.** Не «remote-схема».
   Тот же контракт обслужит iframe-src, будущий MF-аналог ([[058...|ADR 058]] D3) и прямое
   использование. Поэтому app, объявляя контракт, не «знает что оно ремоут» — это просто его API.
3. **Host знает КОНТРАКТ (интерфейс), не внутренности.** Loose coupling ([[059...|ADR 059]]
   принцип 5): знаешь имена/типы in/out событий, не реализацию. Предобмена «живыми» схемами нет.
4. **Single source = одна Zod-схема → много потребителей.** Контракт окупается в ТРЁХ точках:
   build-типы хоста, runtime-валидация, design-time браузинг+провязка в студии. Канон §0 «single
   source of truth» в максимуме.
5. **Build хоста НЕ зависит от живого ремоута.** Контракт-артефакт **вендорится** (снапшот), не
   live-fetch'ится на каждом билде (вывод из MF failure-mode).

## Decisions

### D1 — communication = root-event-bus bridge {#D1}

App имеет свою HCA-шину: события бабблятся вверх до **корневого Feature** (app-level сток, как
`apps/playground/src/features/app.tsx`). Remote-мост на корне:
- **app→host:** событие, дошедшее до корня → форвардится хосту (host ловит через `on*`-проп
  `<Remote.View>`). Standalone — событие просто доходит до корня без host-слушателя (идентичный флоу).
- **host→app:** host диспатчит именованное событие → мост инжектит его в корень → дальше течёт по
  Features/Controllers, обрабатывается штатно. «Host триггерит экшены аппа своими данными».
- **Фильтр = HCA-баблинг.** Наружу доходит только корневой surface (внутренние события уже
  обработаны ниже). Форвардим весь корневой surface — **host сам решает**, что слушать/диспатчить.
  Это снимает «утечку всех useEmit» (принцип 2 контекста): surface ограничен корнем + контрактом.

Маркеры/данные — НЕ спец-канал: host диспатчит обычный экшен аппа (напр. `setMarkers(hostData)` в
тот же хендлер, что у аппа есть). `config-override` ([[059...|ADR 059]] D4) остаётся ТОЛЬКО для
настроек (`apiUrl`, тема, locale) — то, что реально config.

### D2 — контракт = явный Zod public-interface, НЕ autogen-scan {#D2}

App объявляет публичный surface **явно** (не сканом всех Features/Controllers — 90% действий
внутренние, скан = bloat + сложность). Форма — Zod (даёт типы `z.infer` + runtime-валидацию из
одной схемы), отбирает из уже существующих event-типов слоёв (не дублирует payload'ы):

```ts
// remote-app/src/contract.ts — публичный интерфейс аппа (универсален: iframe/MF/direct)
export const contract = defineContract((z) => ({
  in:  { setMarkers: z.object({ markers: z.array(Marker) }) },   // host → app (диспатч в корень)
  out: { markerClick: z.object({ id: z.string() }),              // app → host (корневой surface)
         boundsChange: z.object({ n: z.number(), s: z.number(), e: z.number(), w: z.number() }) },
}));
```
Авторская работа минимальна и это **API-дизайн**, не remote-плумбинг. (Точная форма `defineContract`
+ где живёт — открытый вопрос §open.)

### D3 — контракт-артефакт: одна Zod-схема → четыре производных {#D3}

Сборка ремоута эмитит артефакт, хостящийся **рядом с аппом** (`${url}/.capsule/contract.*`):

| Производное | Из чего | Потребитель |
|---|---|---|
| `manifest.json` | имя/версия/url/preview/описание | карточка в studio-сторе |
| `contract.schema.json` | Zod → JSON-Schema (`zod-to-json-schema`) | **рендер** контракта в UI + cross-tool |
| `contract.d.ts` | Zod → типы | **build-time** типизация у хоста |
| `contract.mjs` | Zod-модуль | **runtime**-валидация у хоста (фильтр ADR 059 D4) |

Универсально для iframe-src И будущего MF-аналога — один артефакт, разные транспорты.

### D4 — дистрибуция: vendored на build, fetched в студии {#D4}

ДВА разных потребителя одного артефакта (не путать):

| Кто | Когда | Как | Зачем |
|---|---|---|---|
| **Host-сборка** | build-time | **вендорит** (explicit sync/install шаг → коммит, как lockfile) | типы + runtime-валидация |
| **Студия** | design-time | **fetch вживую** | браузинг карточки + контракта + провязка |

Build хоста НЕ зависит от доступности ремоута (принцип 5; вывод из MF dts: `typesOnBuild:false` в
prod + issue #3573 гейтит fetch в dev-only → CI/prod-валидация ломается). Студии оффлайн не грозит
(design-time, ремоут под рукой).

### D5 — единый источник регистрации ремоута {#D5}

Сейчас `<Remote.Provider modules={[{name,url}]}>` в странице. Добавлять то же в `capsule.app.ts`
(`remotes:`) = рассинхрон. **Один источник:** ремоут регистрируется один раз в `capsule.app.ts`
(build-eval'ится в node → удобно для тип-codegen'а), а Provider-modules (runtime) **И** тип-codegen
оба производятся из него. Provider в странице перестаёт хардкодить modules.

### D6 — типы приходят глобалами через codegen, без явных импортов {#D6}

Регистрация ремоута расширяет механизм пакетов ([[033-package-registration|ADR 033]] CapsuleRegistryPlugin):
vendored-контракт → codegen `.capsule/@types/remotes.d.ts` → `<Remote.View name="map">` типизирован
по контракту **глобально, без `import type`** в app-коде (канон «no imports in app»). Как
`Maps.*`/`Auth.*` сейчас.

### D7 — studio-store: ремоут = first-class самоописываемый итем {#D7}

Zod-контракт — рантайм-значение → **интроспектится → рендерится**. Студия фетчит артефакт
(D4) и рисует карточку (manifest) + контракт (in/out из `contract.schema.json`) через **существующие**
`/manifests` + `/inspector` + web-renderer (новая машинерия НЕ нужна — меняется источник, не движок).
Разблокирует: drag ремоута на канвас → видимый контракт → визуальная провязка inputs (источники
данных хоста) и outputs (host-хендлеры). «Стор компонентов» обобщается до «стор ремоутов/аппов».

### D8 — runtime = наш event-envelope, не Comlink/tRPC {#D8}

Транспорт — существующий postMessage-envelope ([[059...|ADR 059]] D3) + Zod-валидация на приёме.
**НЕ** адаптируем Comlink/kkrpc (RPC-call-shaped + «best-effort» TS-типы) и **НЕ** tRPC (инференс
требует шаринга TS-сборки → монорепо, мимо независимого деплоя). От них берём идею типизированной
границы, не рантайм.

## Альтернативы (рассмотрены, отвергнуты) {#alternatives}

- **`useEmit`/`useInputs` в app-коде** — remote-awareness, нарушает «app не знает что ремоут» (§context 1). → D1/D2.
- **«Форвардить все useEmit хосту»** — утечка внутренних событий (§context 2). → D1 (корневой surface + контракт).
- **Autogen-scan всех Features/Controllers** — bloat + сложность, 90% внутреннее. → D2 (явный контракт).
- **MF dts live-fetch на билде** — хрупко (prod-гейт `typesOnBuild:false`, issue #3573, оффлайн). → D4 (vendoring). Механизм «host the types» взят, live-fetch — нет.
- **tRPC** — монорепо-coupled (research подтвердил). → D8.
- **Schema-first codegen (OpenAPI/protobuf/GraphQL)** — оверкилл для in-browser event-контракта, свой schema-язык + тулчейн. → D2 (Zod, лёгкий, + json-schema как ПРОИЗВОДНОЕ в D3).
- **Comlink/kkrpc как рантайм** — RPC-shaped, не event-shaped; best-effort типы. → D8.

## Честная плата {#tradeoffs}

1. **Артефакт-эмит — новая build-работа** в сборке ремоута (Zod → manifest/json-schema/d.ts/mjs). Окупается тремя потребителями (принцип 4).
2. **Авторский контракт — небольшая доп-нагрузка** (`contract.ts`). Но это API-дизайн, не remote-плумбинг; и он же даёт валидацию + студийную карточку.
3. **Vendoring = version skew риск** (host'ов снапшот устарел) → митигация: версионируем артефакт (semver/hash) + Zod-валидация в рантайме ловит несовпадение gracefully; sync-шаг показывает дифф.
4. **Build-coupling** при ленивом sync → митигация: вендорим (коммитим), не fetch-на-билд.

## Research (homework, 2026-06-25) {#research}

Deep-research по шарингу типов между фронтами. Ключевое:
- **MF dts** (`@module-federation/dts-plugin`): producer эмитит `@mf-types.zip`, consumer авто-фетчит. НО `typesOnBuild:false` в prod + issue module-federation/core#3573 (fetch гейтнут в `NODE_ENV=development`, переопределяя конфиг) → **live-fetch на CI/prod ломается**. → вендоринг (D4).
- **ts-rest/Zodios**: Zod-контракт отдельной библиотекой, обе стороны типизированы + runtime-валидация; ребилд только при смене контракта. → D2/D3.
- **tRPC**: монорепо-coupled. → отвергнут.
- **Comlink/kkrpc**: typed postMessage RPC, best-effort типы, RPC-shaped. → не рантайм.
Источники — в чекпойнт-памяти сессии + диалоге 2026-06-25.

## Открытые вопросы {#open}

1. **Форма `defineContract` + где живёт** — отдельный `contract.ts`, или секция в `capsule.app.ts`, или derive из корневого `Feature<Events>` с явным `out`/`in` отбором. (Явный — D2; точную форму POC уточнит.)
2. **Vendoring/sync UX** — `capsule remote sync` команда? install-hook? Как выглядит «lockfile типов».
3. **zod→json-schema fidelity** для рендера — все ли наши Zod-конструкции конвертятся читаемо (`zod-to-json-schema` лимиты).
4. **host→app dispatch → разрешение хендлера** в корне (что если аппа не знает событие — молча drop, как loose coupling).
5. **Версионирование контракта** — semver артефакта vs content-hash; политика breaking-change.

## Phase scope {#phases}

- **Phase 0 (POC, ДО accept):** эмит Zod→{json-schema,d.ts,mjs} из одного `contract.ts`; рендер контракта через zod-интроспекцию в studio-инспекторе; vendoring-спайк (sync + commit). Если zod→render и vendoring чисты — `proposed`→`accepted`.
- **Phase 1 (owner-web-core + owner-builders):** `defineContract` + артефакт-эмит в сборке аппа.
- **Phase 2 (owner-builders):** регистрация ремоута в `capsule.app.ts` (D5) + vendoring/sync + `remotes.d.ts` codegen (D6).
- **Phase 3 (owner-web-core + owner-web-remote):** root-event-bus мост (D1) — форвард корневых событий + инжект host-диспатчей; Zod-валидация на приёме. Заменяет придержанную «default-sink» инфру.
- **Phase 4 (owner-studio):** ремоут-итем в сторе — fetch артефакта + рендер через `/manifests`+`/inspector` + визуальная провязка (D7).
- **Browser-verify:** карта-ремоут в studio-сторе показывает контракт; host провязывает `setMarkers`/`onMarkerClick`; типы в `<Remote.View>` без импортов; оффлайн-ремоут не валит build хоста.

## Связано

- [[059-web-remote-app-mode-iframe-src-and-config-override|ADR 059]] — app-mode iframe-src + config-override (база; этот ADR закрывает его открытый event/read vector)
- [[058-web-remote-message-only-mode-by-intent|ADR 058]] — message-only + mode-by-intent (component-mode D3 = будущий потребитель того же контракта)
- [[053-app-as-remote-symmetry-and-config-channel|ADR 053]] — config-канал + симметрия host↔remote
- [[033-package-registration|ADR 033]] — регистрация пакетов → глобалы + codegen (механизм, на который ложится регистрация ремоута)
- [[013-explicit-define-app-config|ADR 013]] — `defineAppConfig` (где регистрируется ремоут, D5)
- [[015-remote-modules]] — оригинальный контракт remote-загрузки
