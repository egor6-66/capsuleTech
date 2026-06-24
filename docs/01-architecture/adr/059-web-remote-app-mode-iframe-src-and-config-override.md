---
tags: [hca, adr, accepted, web-remote, iframe, app-mode, config-override, isolation]
status: accepted
date: 2026-06-24
last_updated: 2026-06-24
amends:
  - 058-web-remote-message-only-mode-by-intent
extends:
  - 013-explicit-define-app-config
  - 053-app-as-remote-symmetry-and-config-channel
  - 015-remote-modules
---

> [!success] Status: accepted (2026-06-24)
> Уточняет субстрат `mode: 'app'` из [[058-web-remote-message-only-mode-by-intent|ADR 058]]:
> app-режим = **iframe `src` на URL приложения**, приложение self-contained (свой solid/router),
> **shared-solid import-map и boot-shell из app-пути выпиливаются**. Вводит **config-override**
> модель: `capsule.app.ts` приложения — база, хост шлёт override-патч поверх (per-key, реактивно,
> неизвестные ключи игнорятся), **0 embedding-кода в приложении**. Public API (`<Remote.View>` /
> `<Remote.Provider>` / `useRemote()`, проп `mode`) не меняется.

# ADR 059 — web-remote: app-mode = iframe-src self-contained + config-override (amends ADR 058)

## Контекст {#context}

[[058-web-remote-message-only-mode-by-intent|ADR 058]] зафиксировал три оси (контракт=сообщения,
транспорт=postMessage, субстрат=явный `mode`) и определил `mode: 'app'` как «iframe-реалм со
своим solid/router». Но **реализация app-режима в коде осталась гибридной** и унаследовала
машинерию shared-deps из MF/[[057-web-remote-import-maps-native-esm|ADR 057]]:

Текущий `mode: 'app'` (`RemoteComponent` → `buildSrcdoc` → `boot.ts`) делает НЕ «загрузи
приложение в iframe», а:

1. строит inline **`srcdoc`** вместо `src` на реальный URL приложения;
2. инжектит **`<script type="importmap">`** (`renderSolidImportMapTag(hostOrigin)`,
   `web-core/solidBundleShim`), перенаправляя `import 'solid-js'` приложения на **solid ХОСТА**;
3. грузит не `index.html` приложения, а спец-**`remote-entry`** + шелл **`boot.js`**, который сам
   импортит `solid-js/store`, вызывает `bootstrap()` и держит postMessage-канал **изнутри**.

То есть **хост-шелл лезет в realm приложения и шарит solid** — это логика
встраивания-как-компонент (вариант Б), ошибочно применённая к app-режиму. ADR 058 убрал host-side
import-map машинерию, но **srcdoc-путь её сохранил**.

**Симптом (browser-verify 2026-06-24).** Канвас (`apps/universal-canvas`, работает standalone на
`localhost:3000`) при встраивании в хост даёт **белый экран**: `#capsule-remote-root` пуст.
Корень — дефолтные пути import-map (`/node_modules/solid-js/dist/solid.js`, `solidBundleShim.ts`)
**не существуют в Vite-dev** (там пре-бандл `/node_modules/.vite/deps/solid-js.js`). `boot.js`
externalize'ит solid и зависит от import-map → падает на первом `import 'solid-js/store'` → ничего
не монтируется. Это **не баг конкретного пути, а симптом лишнего слоя**: app-режиму шаринг solid
не нужен в принципе.

**Противоречие с самим ADR 058.** D1 гласит: «мульти-Solid безопасен, signal'ы не шарятся между
realm'ами, каждый инстанс рулит своим деревом». iframe — отдельный realm. Значит solid хоста и
solid iframe'а **не должны** быть одним инстансом (два solid в двух realm'ах = две вкладки
браузера, норма). Import-map для шаринга solid в app-режиме и **не нужен**, и **противоречит** D1,
и **ломает** прямо сейчас.

## Принципы {#принципы}

1. **app = «браузер в браузере».** `mode: 'app'` грузит приложение как **самостоятельное**: его
   собственный `index.html`/entry, его solid, его router. Хост его не монтирует и в его realm не лезет.
2. **Один канал — postMessage** (наследие ADR 058 D2). Через границу — только сериализуемые
   envelope'ы. Никаких живых ссылок, никакого shared-realm.
3. **Embedding невидим приложению.** App-разработчик НЕ пишет «если встроен — читай postMessage».
   Он объявляет config в `capsule.app.ts` и читает `config.X`. Детект встраивания + приём
   override + merge — **внутри фреймворка** (web-core bootstrap + сгенерённый entry).
4. **Config — override, а не replace.** `capsule.app.ts` приложения = база (источник правды). Хост
   шлёт **патч** поверх: перезаписывает свои ключи, остальное — app-дефолты. Неизвестные ключи
   ремоут игнорит (схема config'а приложения — фильтр). Реактивно (хост может оверайдить в рантайме).
5. **Loose coupling — хост может не знать, кого подключает.** Хост шлёт override «вслепую»;
   приложение само берёт только то, что знает по своей схеме, лишнее молча отбрасывает. Никакого
   предварительного обмена схемами. Усиливает message-only канон (§0).
6. **Все host→app данные — это config.** Отдельной сущности «props» (рантайм-данные по ссылке) нет:
   и стартовые настройки, и рантайм-данные от хоста (напр. «вот свежие маркеры») — это ключи того же
   config'а с override. App→host остаются **события** (`channel`/`on*`), это другой вектор.
7. **Public API стабильный.** `<Remote.View>` / `<Remote.Provider>` / `useRemote()` и проп
   `mode?: 'app' | 'component'` — без изменений. Меняется только internal-субстрат app-режима.

## Decisions

### D1 — app-субстрат: iframe `src` = URL приложения {#D1}

Заменяет текущий srcdoc-механизм app-режима. `<Remote.View mode="app">` рендерит
`<iframe src="${module.url}/...">` на **реальный embeddable-entry приложения**, не inline-`srcdoc`.
Приложение поднимает себя само (свой bootstrap, свой solid, свой router) — идентично standalone.

**Что уходит из app-пути:** `buildSrcdoc` (генерация srcdoc), `boot.ts` как host-injected
module-resolution шелл, `remote-entry` как externalize'нутый bundle, инжект import-map.

### D2 — shared-solid import-map в app-режиме выпиливается {#D2}

`renderSolidImportMapTag` / `buildSolidImportMap` (`web-core/solidBundleShim`) **не участвуют** в
app-режиме. Приложение в iframe бандлит/резолвит свой solid сам (его Vite/сборка). Корректность —
по ADR 058 D1 (мульти-Solid между realm'ами безопасен). `solidBundleShim` остаётся в кодбейзе
только если найдётся реальный потребитель в `component`-режиме; иначе — кандидат на удаление
(решается при реализации component-seam'а).

### D3 — транспорт: postMessage, без изменений {#D3}

Единственный канал host ↔ app — `postMessage` (ADR 058 D2). `IRemoteChannel` / envelope'ы
(`__capsule_remote_config__`, события) сохраняются как контракт сообщений. Cross-origin iframe
(приложение на своём origin) postMessage не мешает — это его прямое назначение.

### D4 — config-override модель {#D4}

Итоговый config приложения = **`appConfig` (floor) ⊕ `hostOverride` (поверх)**:

- **База** — `defineAppConfig` приложения (`capsule.app.ts`, [[013-explicit-define-app-config|ADR 013]]).
  Source of truth, дефолты. Standalone — работает только на ней.
- **Override** — хост шлёт через config-канал **патч**, не полный config. Merge **per-key,
  shallow, host wins**: ключ из патча перезаписывает; отсутствующий — оставляет app-дефолт.
- **Фильтр-схема, на приёме у ремоута.** Известные ключи определяет config-схема приложения (zod из
  `defineAppConfig`). Фильтр живёт **на стороне приложения при приёме** патча — хост может вообще не
  знать, кого подключает, и слать override вслепую; неизвестные ключи приложение молча отбрасывает
  (валидация + защита от инъекции). Никакого предварительного обмена схемами.
- **Реактивно** — хост может слать override-патчи в рантайме; config-store ремоута ре-мержит,
  приложение реагирует штатной solid-реактивностью.
- **Нет отдельных «props».** И стартовые настройки, и рантайм-данные хост→апп — это ключи config'а
  (принцип 6). Отдельный props-канал из ADR 053 в app-режиме не вводится. App→host — события
  (`channel.send` / `on*`), отдельный вектор, не часть config-override.

Host-side merge провайдера остаётся по ADR 053 (provider.config → modules[name].config →
`<Remote config>`), и его результат — это и есть `hostOverride`, накладываемый на `appConfig`.

### D5 — embed-handshake внутри фреймворка, не на поверхности приложения {#D5}

Тонкий «я встроен → возьми override» слой живёт в **сгенерённом app-entry / web-core bootstrap**,
не в коде приложения:

1. Детект встраивания: `window.parent !== window` (приложение внутри iframe).
2. Если встроен — до/вокруг mount'а сделать handshake (послать ready, принять initial
   override-патч через postMessage), смержить в реактивный config-store (D4), затем монтировать.
   Таймаут-fallback на app-дефолты, чтобы standalone / медленный хост не висли.
3. Если не встроен — просто app-дефолты, никакого postMessage.

App-разработчик пишет `capsule.app.ts` + читает `config.X`. Всё. **`IRemoteBootstrap(root, {props,
config, channel})` из ADR 053 в app-режиме НЕ требуется** — приложение монтирует себя своим обычным
entry, спец-экспорт `bootstrap` не нужен (он противоречил бы «0 embedding-кода»). В `component`-режиме
вопрос контракта монтирования остаётся открытым (отложен вместе с seam'ом, ADR 058 D3).

### D6 — component-режим без изменений {#D6}

`mode: 'component'` (shadow-DOM, апп-как-компонент без своего router/solid) — отложенный seam
по ADR 058 D3. Этот ADR его не реализует и не меняет. Вариант-Б логика (хост монтирует, шарит
realm) легитимна именно здесь — но это отдельная будущая проработка.

### D7 — Public API стабильный {#D7}

`<Remote.View>` / `<Remote.Provider>` / `useRemote()` / проп `mode` — без изменений. Смена
субстрата app-режима (srcdoc → iframe-src) и config-override — internal + контракт `capsule.app.ts`.

## Честная плата {#tradeoffs}

1. **Дублирование solid-байтов.** Каждый app-iframe тащит свой solid (своя сборка). Это
   корректность, не оптимизация (ADR 058 D1). Dedup — не для app-режима (разные realm'ы всё равно
   не делят инстанс); если встанет вопрос байтов — отдельное решение.
2. **Cross-origin iframe.** Приложение на своём origin → host не может читать `contentWindow.document`.
   Но мы используем только postMessage → ок. `sandbox`-набор и CSP — уточнить при реализации.
3. **Embeddable-entry приложения.** Нужен способ, которым приложение сервит entry для встраивания
   и участвует в handshake. Это генерится фреймворком (vite-builder/CLI-скаффолд), **не** ручная
   нагрузка на app-автора — но это новый слой в сборке приложения.
4. **Нет визуального слияния с CSS/DOM хоста** — app/iframe прямоугольник со своим документом.
   Известные кейсы (карта, канвас) самодостаточны → ок. Слияние — территория component-режима.

## Что отменяется/меняется относительно текущего кода {#изменения}

- `web-remote`: app-путь `RemoteComponent` → `<iframe src=...>` вместо `buildSrcdoc`+`boot.js`+import-map.
  `buildSrcdoc.ts` / `shell/boot.ts` — удаляются или переводятся в component-only seam (TBD при реализации).
- `web-core`: `solidBundleShim` (`renderSolidImportMapTag`/`buildSolidImportMap`) — вне app-пути,
  кандидат на удаление.
- `web-core` / `vite-builder` / `cli`: embed-handshake + config-override merge в bootstrap/сгенерённом
  app-entry; wiring `capsule.app.ts` override поверх `defineAppConfig`.
- `vite-builder`: модель remote-entry (externalize solid) — отменяется для app-режима; приложение
  собирается self-contained. Манифест (`capsule.manifest.json`) может сохраниться для метаданных +
  публикации config-схемы (какие ключи хост может оверайдить) — TBD.

## Решено (обсуждение 2026-06-24) {#решено}

1. **`IRemoteBootstrap` в app-режиме не требуется.** Приложение монтирует себя своим обычным entry;
   спец-экспорт `bootstrap` не нужен. В `component`-режиме контракт монтирования — открыт, отложен
   с seam'ом (ADR 058 D3). → D5.
2. **Отдельных «props» нет.** Все host→app данные (стартовые + рантайм) — это config с override.
   App→host — события. → принцип 6, D4.
3. **Фильтр известных ключей — на приёме у приложения.** Хост может не знать, кого подключает; шлёт
   override вслепую, приложение отбрасывает незнакомое по своей схеме. Предобмена схемами нет. → принцип 5, D4.

## Открытые вопросы {#открытые-вопросы}

1. **Cross-origin hardening (не блокер, во время реализации).** `sandbox`-флаги, CSP, ужесточить
   `postMessage` targetOrigin с `'*'` до известного host-origin.
2. **Контракт монтирования `component`-режима** — отложен вместе с seam'ом (ADR 058 D3), решается
   при его реализации.
3. **Манифест в app-режиме** — нужен ли `capsule.manifest.json` вообще, если entry = URL приложения
   (а не bundle), и config-схема фильтруется на приёме? Возможен только для метаданных (name/version).
   Уточняется при реализации D1.

## Phase scope (после accept — отдельные брифы owner'ам)

1. **owner-web-remote** — app-режим: `<iframe src>` вместо srcdoc; удалить/изолировать
   `buildSrcdoc`/`boot.ts`; убрать import-map из app-пути.
2. **owner-web-core** — embed-handshake + config-override merge в bootstrap; вывести `solidBundleShim`
   из app-пути.
3. **owner-builders (+ owner-cli)** — self-contained сборка приложения для встраивания, генерация
   embeddable-entry, wiring `capsule.app.ts` override поверх `defineAppConfig`.
4. **Browser-verify** — канвас (`apps/universal-canvas`) встраивается в хост, грузится как iframe-src,
   рендерится (не белый экран), config-override из хоста применяется, событий редиректа нет. Реальный
   браузер (память `feedback_verify_in_browser_dont_guess`).

## Связано

- [[058-web-remote-message-only-mode-by-intent|ADR 058]] — message-only + mode-by-intent (этот ADR уточняет субстрат app-режима)
- [[053-app-as-remote-symmetry-and-config-channel|ADR 053]] — config-канал, `IRemoteBootstrap`, reserved props (база для config-override)
- [[013-explicit-define-app-config|ADR 013]] — `defineAppConfig` / `capsule.app.ts` (floor config-override модели)
- [[015-remote-modules]] — оригинальный контракт remote-загрузки
- [[057-web-remote-import-maps-native-esm|ADR 057]] — superseded (откуда пришла import-map/shared-solid машинерия)
- [[047-frontend-architecture-zones-cycle-vendor]] — zone canon (web-remote в `packages/web/runtime/remote/`)
