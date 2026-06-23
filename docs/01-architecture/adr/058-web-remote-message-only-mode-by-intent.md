---
tags: [hca, adr, accepted, web-remote, postmessage, iframe, isolation, message-contract]
status: accepted
date: 2026-06-24
last_updated: 2026-06-24
supersedes:
  - 057-web-remote-import-maps-native-esm
extends:
  - 015-remote-modules
  - 053-app-as-remote-symmetry-and-config-channel
---

> [!success] Status: accepted
> Канон `@capsuletech/web-remote`: **один контракт — сообщения**, **один транспорт — postMessage/iframe**, **субстрат выбирается явным `mode` по намерению, не по origin**. Live-props-по-ссылке и вся shared-realm import-map машинерия ADR 057 (D1/D4) — **отменены**. Контракт `IRemoteBootstrap(root, { props, config, channel })` сохраняется без изменений — `props`/`config` гидрятся из envelope'ов канала. Public API (`<Remote.View>`, `<Remote.Provider>`, `useRemote()`) не меняется.

# ADR 058 — web-remote: message-only contract + mode-by-intent (supersedes ADR 057)

## Контекст {#context}

[[057-web-remote-import-maps-native-esm|ADR 057]] предложил делить runtime-singleton'ы
(Solid и др.) между host'ом и remote через browser-native `<script type="importmap">` +
ESM dedup, с shadow-DOM как дефолтным субстратом. ADR был принят на основе vanilla-POC, но
**в capsule-интеграции в реальном браузере не проверялся**, а реализация (`importMap.ts`
builder-плагин, `/_shared/`, `LocalShadowDomTransport`, shared-realm правки `RemoteComponent`)
**в main не мержилась** — жила на ветке эксперимента.

Разбор 2026-06-23 ([[adr-057-remote-reconsideration|brief]]) вскрыл три проблемы дизайна 057:

1. **Два механизма на одну задачу (нарушение канона §0).** Реактивные props через канал
   (iframe-путь: `__capsule_remote_props__` → remote `createStore` → effect'ы) **уже
   работают**. Live-props-по-ссылке через shared-realm — это второй механизм на ту же
   задачу. Единственная причина существования shared-realm и всей import-map машинерии —
   именно доставка props по ссылке. Убираем её — отпадает весь слой.

2. **Субстрат выбирался по origin, а не по намерению.** `LocalShadowDomTransport.canReach`
   = same-origin → любой same-origin полный app принудительно ехал по shared-realm пути.
   Симптом: `apps/universal-canvas` (полный app со своим роутером) в shared-realm дрался с
   роутером хоста за один `window.location` → редирект на `/`. Это баг shared-режима по
   построению; в iframe его не бывает.

3. **Преждевременная сложность.** import-map + `/_shared/` + dedupe + shadow-Tailwind —
   большой слой, оправданный только визуальным слиянием remote с CSS/DOM хоста. Реальные
   кейсы (карта-виджет, канвас-app) — **самодостаточны**, слияния не требуют.

## Принципы {#принципы}

1. **Один контракт — сообщения.** Через границу remote пересекает не живая ссылка, а
   **сериализуемый экшен/данные**. Жест (drag, click) живёт в хосте; через канал уходит
   его *результат* («вставь компонент X в место Y»). Транспорт-агностично: неважно, едет
   сигнал прямой ссылкой или postMessage — данные те же, меняется только способ доставки.
2. **props — это developer-facing форма поверх канала, а не отдельный механизм.** Remote
   получает реактивный `props`-объект, поля которого обновляются; «кормит» их канал, а не
   прямая ссылка на signal. Эргономика HCA/Solid сохраняется, второй механизм не вводится.
3. **Субстрат — по намерению, ортогонально origin.** `mode: 'app' | 'component'` —
   явная декларация host-side, не вывод из same-origin.
4. **Native browser boundary > vendor codegen.** Изоляция — нативная (iframe-реалм /
   shadow-root), не runtime-слой поверх ESM.
5. **Public API стабильный.** `<Remote.View>` / `<Remote.Provider>` / `useRemote()` /
   `IRemoteBootstrap` — без изменений. Транспорт/субстрат — internal.

## Три ортогональные оси {#axes}

Дизайн 057 слил их в одну («субстрат = транспорт = механизм dedup»). Разводим:

| Ось | Что | Решение 058 |
|---|---|---|
| **Контракт** | что пересекает границу | **сообщения** (live-by-reference отменён) |
| **Транспорт** | как байты едут | **один — postMessage**; `broadcast-channel`/`socket`/`local` — YAGNI |
| **Субстрат** | реалм исполнения | **явный `mode`** (`app` = iframe / `component` = shadow-DOM) |

## Decisions

### D1 — Контракт: только сообщения, live-by-reference отменён {#D1}

Отменяет [ADR 057 D1](057-web-remote-import-maps-native-esm#D1) (shared deps по ссылке через
import-map). Host и remote **не делят** инстанс Solid/web-core по ссылке. Всё межграничное
общение — через `IRemoteChannel` (envelope'ы `__capsule_remote_props__` /
`__capsule_remote_config__` для входящих props/config, именованные события для остального).

Контракт `IRemoteBootstrap(root, { props, config, channel })` (наследие
[ADR 053](053-app-as-remote-symmetry-and-config-channel)) **не меняется** — он уже
message-based. `props`/`config` — реактивные прокси, гидрятся из входящих envelope'ов.

**Следствие — мульти-Solid безопасен.** Несколько инстансов Solid (host + N remote'ов)
сосуществуют, потому что signal'ы **не шарятся** между ними. Каждый инстанс управляет своим
деревом; реактивность срабатывает локально на стороне получателя при апдейте props через
канал. Owner-tree / subscriber-list per-instance — больше не проблема, т.к. cross-instance
шаринга нет.

### D2 — Транспорт: один, postMessage/iframe {#D2}

Phase 1 — единственный транспорт `post-message` (host ↔ iframe). `local` /
`broadcast-channel` / `socket` из `TransportKind` — **YAGNI**, не реализуем и не выбираем
автоматически. Cross-origin standalone / cross-device (`serverUrl`) — за рамками Phase 1.

Существующий iframe-srcdoc механизм (`web-core/bootstrap`: `buildSolidImportMap` /
`renderSolidImportMapTag`, `web-remote/buildSrcdoc`) **сохраняется** — он инжектит import-map
**внутрь iframe** только для резолва `solid-js` remote-бандлом в iframe-реалме. Это module
resolution для отдельного реалма, **не** shared-realm-by-reference — не путать с отменённой
машинерией 057.

### D3 — Субстрат: явный `mode`, не по origin {#D3}

Заменяет [ADR 057 D4](057-web-remote-import-maps-native-esm#D4) (выбор субстрата по
`canReach`/origin).

- **`mode: 'app'` (iframe) — РЕАЛИЗУЕТСЯ в Phase 1.** Свой реалм, своё `window`/`location`/
  History, свой инстанс Solid, свой роутер. CSS изолирован iframe'ом бесплатно. Для
  изолированного app внутри хоста (studio-канвас: превью темплейтов через renderer /
  ручная сборка). Редирект-баг (проблема 057) **невозможен по построению** — у iframe своё
  окно.
- **`mode: 'component'` (shadow-DOM) — ТОЛЬКО seam, реализация отложена.** Зарезервированное
  место в API/типах, **не строим в Phase 1**. Для случая, когда модуль встраивается как
  часть хоста (течёт в layout, берёт config из хоста), оставаясь самодостаточным по стилям.
  Требует отдельной проработки (возможен capsule-native аналог Module Federation) — см.
  [Открытые вопросы](#открытые-вопросы).

Выбор `mode` — per-view host-side декларация (`<Remote.View mode="app" />`), дефолт `'app'`.
Ортогонален origin.

#### Ограничение component-режима (на будущее)

`component`-remote живёт в общем JS-реалме (shadow-root, не iframe) → делит `window` хоста.
Поэтому он **не должен владеть глобальным роутером** (иначе вернётся драка за
`window.location` — корень редирект-бага 057). Если нужна навигация — memory-history.
`app`-режим этим не ограничен (своё окно).

### D4 — Public API стабильный {#D4}

`<Remote.View>` / `<Remote.Provider>` / `useRemote()` / `IRemoteBootstrap` — без изменений
по сравнению с текущим main. Добавляется опциональный `mode?: 'app' | 'component'` в
`IRemoteComponentProps` (дефолт `'app'`) — единственное расширение API.

## Честная плата {#tradeoffs}

1. **Дублирование runtime-байтов.** Без import-map dedup каждый remote тащит свою копию
   Solid (и других shared-singleton'ов). Это **perf-оптимизация, не корректность** —
   откладывается без вреда. Корректность не страдает: signal'ы не шарятся, мульти-Solid
   безопасен (D1). Опциональный dedup — отдельное будущее решение, если байты станут
   проблемой.
2. **Нет визуального слияния с CSS/DOM хоста в Phase 1.** `app`/iframe — прямоугольник со
   своим документом. Оба известных кейса (карта, канвас) самодостаточны → ок. Слияние —
   территория `component`-режима (отложен).

## Что отменяется из ADR 057 {#отменяется}

Код этой машинерии **удалён** на ветке (не доехал до main):

- `packages/builders/vite/src/plugins/importMap.ts` (+ тест, + регистрация в `index.ts` и
  `capsuleConfig.ts`).
- `packages/web/runtime/remote/src/transport/LocalShadowDomTransport.ts` (+ тест).
- `packages/web/runtime/remote/src/runtime/manifestFetcher.ts` (+ тест) и shared-realm
  правки `RemoteComponent`/`RemoteProvider`/`interfaces` (откачены к main).
- `remoteManifest.ts` D2-расширение (`shared`/`exposes`) — откачено к main.

Void'ятся брифы: `adr-057-phase1-vite-builder`, `adr-057-phase1-web-remote`,
`adr-057-phase1a-fix-optimizeDeps-exclude`, `adr-057-phase1a-fix-resolveShared-conditions`.

ADR 057 сохраняется как запись направления со `status: superseded`.

## Phase 1 scope (не часть этого ADR — отдельные брифы owner'ам)

1. **owner-web-remote**: добавить `mode?: 'app' | 'component'` в `IRemoteComponentProps`
   (дефолт `'app'`); `component` — типизированный seam без реализации (throw/ warn «not yet»).
   Подтвердить, что iframe/postMessage путь (props через `__capsule_remote_props__`, события
   через канал) — единственный активный.
2. **owner-web-remote**: убрать из `ITransport`-резолвера авто-выбор по `canReach`; оставить
   только post-message.
3. **Браузерная верификация** `app`-режима: studio-канвас (`apps/universal-canvas` в
   playground) монтируется в iframe, props host→canvas и события canvas→host идут через
   канал, редиректа нет. jsdom-юнитов недостаточно — нужен реальный браузер (память
   `feedback_verify_in_browser_dont_guess`).

## Открытые вопросы (для будущего `component`-режима) {#открытые-вопросы}

1. Нужен ли вообще `component`-режим как shadow-DOM, или достаточно iframe для всех кейсов?
   Решается, когда появится реальный кейс визуального слияния.
2. Если нужен — это shadow-DOM custom-element с props-as-properties + CustomEvent, или
   полноценный capsule-native аналог Module Federation? Требует отдельного ADR и homework
   (память `feedback_homework_before_adr`).

## Связано

- [[015-remote-modules]] — оригинальный контракт remote-загрузки
- [[053-app-as-remote-symmetry-and-config-channel|ADR 053]] — `IRemoteBootstrap`, two-channel, reserved props (база контракта 058)
- [[057-web-remote-import-maps-native-esm|ADR 057]] — superseded (import-map + shared-realm)
- [[056-web-remote-mf2-iframe-transport-hybrid|ADR 056]] — rejected (MF2 + iframe-transport)
- [[adr-057-remote-reconsideration]] — brief-разбор, на котором построен этот ADR
- [[047-frontend-architecture-zones-cycle-vendor]] — zone canon (web-remote в `packages/web/runtime/remote/`)
