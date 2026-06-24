---
tags: [hca, adr, superseded, web-remote, import-maps, native-esm, shared-deps, css-isolation]
status: superseded
date: 2026-06-23
last_updated: 2026-06-24
superseded_by:
  - 058-web-remote-message-only-mode-by-intent
supersedes:
  - 056-web-remote-mf2-iframe-transport-hybrid
extends:
  - 015-remote-modules
  - 053-app-as-remote-symmetry-and-config-channel
---

> [!warning] Status: superseded by [[058-web-remote-message-only-mode-by-intent|ADR 058]]
> Принят на основе vanilla-POC, но в capsule-интеграции в реальном браузере не проверялся, в
> main не мержился. Разбор 2026-06-23 ([[adr-057-remote-reconsideration]]) показал: shared-realm
> live-by-reference — второй механизм на ту же задачу (props через канал уже работают), а выбор
> субстрата по origin порождал редирект-баг. ADR 058 отменяет D1/D4 (import-map + shared-realm),
> переходит на message-only контракт + `mode` по намерению. Документ сохранён как запись направления.

> [!success] Status: accepted (browser-level feasibility подтверждена)
> Канон для внутренней архитектуры `@capsuletech/web-remote`: shared deps через **browser-native `<script type="importmap">` + native ESM dedup**, без посредников. Никакого Module Federation, никаких runtime plugin'ов, никакого vendor codegen. CSS isolation — отдельная декларация (shadow DOM default), orthogonal к module loading. Public API (`<Remote.View>`, `<Remote.Provider>`, `useRemote()`, `IRemoteBootstrap`) не меняется.

# ADR 057 — web-remote: Import maps + native ESM (supersedes ADR 056)

## Контекст {#context}

Capsule подключает приложения как remote-модули с тремя требованиями:

1. **Shared singleton dependencies.** Host и remote должны делить один экземпляр `solid-js`, `solid-js/web`, `solid-js/store`, `@capsuletech/web-core` и других runtime-singleton'ов — иначе reactivity / HCA identity рвутся (Owner tree per-Solid-instance, subscriber lists per-signal-module-instance).
2. **CSS isolation.** Editor capsule mount'ит remote с user-defined / 3rd-party кодом — глобальные стили host'а и remote'а не должны протекать.
3. **Independent versioning / build.** Host и remote эволюционируют раздельно, deployable независимо.

[[056-web-remote-mf2-iframe-transport-hybrid|ADR 056]] предложил решение через Module Federation 2 + iframe-transport. **Отвергнут после Шага 0** (см. секцию ["Почему ADR 056 не сработал"](#почему-adr-056-не-сработал)).

## Принципы {#принципы}

1. **Native browser mechanism > vendor codegen.** Browser ESM с `<script type="importmap">` дедуплицирует module instance по URL — это W3C spec, реализована во всех современных движках. Никаких proxy modules, никакого runtime resolution layer. Что выбрали `<script type="importmap">{ "imports": { "solid-js": "URL" } }</script>` — то и работает, симметрично в host и remote.
2. **Module loading и CSS isolation — orthogonal.** ADR 056 их пытался решить одним механизмом (MF + iframe-transport). Это была ошибка декомпозиции. Module dedup решается import-map, CSS isolation — shadow DOM либо iframe wrap, выбираемо отдельно.
3. **Public API стабильный.** Consumer'ы видят `Remote.*` namespace ([[033-package-registration-mechanism|ADR 033]] registration), не транспорт. Это даёт capsule свободу эволюционировать transport (sw-cached static / esm.sh-style edge / local) без breaking consumer'ов.
4. **App-as-Remote symmetry сохраняется** ([[053-app-as-remote-symmetry-and-config-channel|ADR 053]]). Любой `apps/<name>` подключаем как remote через `src/remote.ts` экспорт `bootstrap: IRemoteBootstrap`. Это контракт уровня app, не уровня транспорта — поэтому смена D1-D4 транспорта на ADR 057 его не затрагивает.

## Decisions

### D1 — Shared deps через `<script type="importmap">` {#D1}

Capsule-builder при `capsule build` (и в dev через `transformIndexHtml`-плагин) эмиттит per-app import-map с pinned absolute URL'ами для всех shared singleton'ов:

```html
<!-- inject'ится в .capsule/index.html обоих apps -->
<script type="importmap">
{
  "imports": {
    "solid-js": "/_shared/solid-js@1.9.12/dist/solid.js",
    "solid-js/web": "/_shared/solid-js@1.9.12/web/dist/web.js",
    "solid-js/store": "/_shared/solid-js@1.9.12/store/dist/store.js",
    "@capsuletech/web-core": "/_shared/@capsuletech/web-core@X.Y.Z/dist/index.mjs",
    "@capsuletech/web-router": "/_shared/@capsuletech/web-router@X.Y.Z/dist/index.mjs"
  }
}
</script>
```

Когда host загружает remote-bundle через native `import(remoteUrl)`, remote делает `import 'solid-js'` → browser резолвит через import-map → **тот же URL что у host'а** → browser ESM cache дедуплицирует → **один module instance**.

Browser-level mechanism доказан Шагом 0.5 (POC `experiments/import-map-poc/`): `createSignal` в host'е, `createEffect` в dynamically-imported remote module — effect re-runs на каждый host setSignal, identity Solid module одна и та же. Без proxy modules, без runtime layer.

#### Discovery URL'ов

Phase 1 — простая схема: host serves `/_shared/` под-путь с симлинками на `node_modules/` resolved deps. Production — отдельный capsule-CDN deploy под фиксированный path (orthogonal к ADR — это deployment concern).

#### Versioning

URL содержит версию (`solid-js@1.9.12`). Host и remote обязаны использовать совместимые версии shared deps. Mismatch → две версии в import-map → два module instance → reactivity break. Capsule-builder валидирует на build-time через `peerDependencies` остального manifest'а ([D2](#D2)).

### D2 — Remote manifest format — **extends existing `RemoteManifestPlugin`** {#D2}

Capsule уже имеет `RemoteManifestPlugin` (`packages/builders/vite/src/plugins/remoteManifest.ts`), который эмиттит `/capsule.manifest.json` (dev endpoint + build asset) с базовой shape `{ name, version, entry }` и интегрирован с ADR 053 flow (user `src/remote.ts` → generated `.capsule/remote-entry.ts` → bundle entry с hash).

**ADR 057 расширяет** этот manifest добавлением `exposes` и `shared`, **не заменяет**. URL/filename/name convention — сохраняются.

```json
{
  "$schema": "https://capsuletech.dev/schemas/remote-manifest-v1.json",
  "name": "universal-canvas",
  "version": "1.2.3",
  "entry": "/remote-entry.B3f9q1xY.js",
  "exposes": {
    "./remote": "/remote-entry.B3f9q1xY.js"
  },
  "shared": {
    "solid-js": { "version": "1.9.12", "singleton": true },
    "solid-js/web": { "version": "1.9.12", "singleton": true },
    "solid-js/store": { "version": "1.9.12", "singleton": true },
    "@capsuletech/web-core": { "version": "0.X.Y", "singleton": true }
  }
}
```

**Существующие поля** (сохраняются как есть):
- `name` — basename npm pkg name (`@capsuletech/universal-canvas` → `universal-canvas`), читается из app's `package.json`
- `version` — из app's `package.json`
- `entry` — **реальный bundle filename из output** (с rolldown hash в build, `/remote-entry.ts` в dev) — резолвится `generateBundle` hook'ом RemoteManifestPlugin

**Новые поля (Phase 1 D2)**:
- `$schema` — optional reference (для будущей валидации)
- `exposes` — Phase 1 hardcoded `{ "./remote": entry }` (single entry per ADR 053). Multi-expose — Phase 2 extension.
- `shared` — list shared deps c version + singleton-флагом. Источник: canonical `SHARED_DEPS` const из vite-builder + resolved versions через `require.resolve()` из app's node_modules

**URL** — `/capsule.manifest.json` (не `/manifest.json`). Существующий web-remote consumer уже подписан на этот URL (per memory `project_remote_manifest_phase1a`).

Host fetch'ит manifest у remote URL до подключения, читает `shared`, validate'ит version compat против host's import-map (D1), затем native `import(<entry-URL>)`.

### D3 — Host runtime — manifest discovery + import-map merge {#D3}

`<Remote.Provider modules={[...]}>` при mount:
1. Параллельно fetch'ит `${url}/manifest.json` для каждого remote.
2. Merge'ит `shared` всех remote'ов в host's import-map (validate version compat).
3. Если import-map ещё не emit'нут (host's initial load уже завершён) — appends merged import-map к `<head>` через dynamic injection. **Важно**: import-map injection после load обычно invalidates существующие resolutions; для capsule canon — import-map'ы сериализуются и emit'аются на server-side через transformIndexHtml плагин (см. Phase 1).

`<Remote.View name="...">` при render:
1. `await import(remoteEntryUrl)` — нативный ES dynamic import.
2. Resolved module's `bootstrap: IRemoteBootstrap` (контракт [ADR 053](053-app-as-remote-symmetry-and-config-channel)) даёт точку входа.
3. Mount внутрь `<Remote.View>`-контейнера согласно [D4](#D4) (default — shadow DOM custom-element wrap).

### D4 — CSS isolation: shadow DOM custom-element wrap (default), iframe (opt-in) {#D4}

Module loading (D1-D3) и CSS isolation — независимые проблемы. Default стратегия:

**Shadow DOM custom-element** — remote app экспозит регистрационную функцию `registerRemoteElement()`, которая `customElements.define('<remote-name>-element', class extends HTMLElement {...})`. Host рендерит `<remote-name>-element>` внутрь `<Remote.View>`. CSS внутри shadow root → полная изоляция от host CSS. Communication через DOM CustomEvent (стандарт W3C).

**Iframe** — opt-in флаг `<Remote.View isolation="iframe">`. Strict realm boundary, нужно если remote untrusted. Иначе overhead не оправдан.

Selection — per-view конфиг на host, не глобальный.

### D5 — Public API стабильный {#D5}

`<Remote.View>`, `<Remote.Provider>`, `useRemote()`, `IRemoteBootstrap` — без изменений по сравнению с текущим custom web-remote runtime. Capsule freedom менять internal transport (import-map vs `@module-federation/runtime` standalone vs что ещё) — consumer'у это не видно.

## Почему ADR 056 не сработал {#почему-adr-056-не-сработал}

ADR 056 ставил на `@module-federation/vite` как foundation. Шаг 0 (feasibility test через capsule CLI с минимальным federation config) показал **fundamental incompatibility с Solid**:

- `@module-federation/vite` генерирует virtual shared-loader proxy module для каждого shared package.
- Этот proxy module **не re-exports полный API surface** оборачиваемого package'а — он экспозит только подмножество которое плагин-codegen считает hot.
- Подмножество захардкожено под React (`use`, etc.).
- Vite-plugin-solid через babel transпилирует JSX в `import { setStyleProperty, template, insert, render, ... } from 'solid-js/web'` — десятки exports.
- Эти exports proxy не предоставляет → `SyntaxError: The requested module does not provide an export named 'setStyleProperty'` при первом import'е JSX-производного кода.
- Workaround через config (убрать `solid-js/web` из `shared:`) **не работает**: плагин шарит `solid-js/web` автоматически независимо от пользовательского config'а (видит vite-plugin-solid в chain).

Это **не баг конфигурации, а архитектурное допущение плагина**: shared package = thin API surface как у React. Fork плагина с full re-export Solid surface возможен, но: (а) постоянный maintenance burden, (б) каждый upstream merge ризикует re-broken, (в) фундаментально воюем с дизайном плагина.

Альтернатива — `@module-federation/runtime` standalone (без `@module-federation/vite` codegen) с нашим build glue — теоретически возможна, но это уже implementation поверх low-level runtime API, который ничего не даёт сверх того что нативная browser-механика делает бесплатно (import-map + ESM dedup).

Поэтому — direction 3 (this ADR), не runtime standalone и не fork.

## Что валидировал Шаг 0.5 {#feasibility}

Vanilla browser POC (`experiments/import-map-poc/`, throwaway после теста):

| H | Что проверяли | Result |
|---|---|---|
| H-a | Solid identity shared между host и dynamically-imported remote через import-map | ✅ PASS — `sameCreateSignal: true, sameCreateEffect: true` |
| H-b | Host signal → remote `createEffect` re-runs на каждый host setSignal | ✅ PASS — 12 кликов = 12 effect re-runs, `effectRuns` инкрементится в ногу с `hostCount` |
| H-c | `solid-js/web` full export surface available (`setStyleProperty`, `template`, `insert`, `render`, `Dynamic`, `Portal`) | ✅ PASS — все exports present, none missing |

Browser-level foundation подтверждена. Capsule integration — это Phase 1 implementation, не feasibility risk.

## Phase 1 scope (не часть этого ADR)

1. **`@capsuletech/vite-builder`**: transformIndexHtml-плагин эмиттит `<script type="importmap">` в `.capsule/index.html` для каждого app. URL'ы для shared deps — `/_shared/<pkg>@<version>/...` (dev: symlinks на `node_modules/`, prod: capsule-builder copies bundles в `dist/_shared/`).
2. **`@capsuletech/vite-builder`**: build-time emit `manifest.json` per app в `dist/` с deps + exposes (по `capsule.config.ts:remote` декларации — расширение ADR 053).
3. **`@capsuletech/web-remote`**: переписать transport — `<Remote.Provider>` fetch'ит remote manifests, merge'ит import-maps, validate version compat. `<Remote.View>` делает native `import()` + mount через D4 strategy.
4. **CSS isolation Phase 1**: shadow DOM custom-element wrap. Iframe — Phase 2.

Phase 1 пишется отдельными брифами для owner-vite-builder и owner-remote после approval этого ADR.

## Не входит в этот ADR

- Production CDN strategy. Все URL'ы в Phase 1 — same-origin. Edge-deploy под отдельный path — отдельное решение.
- `IRemoteBootstrap` контракт. Унаследован из [ADR 053](053-app-as-remote-symmetry-and-config-channel), не меняется.
- Cross-app Controller/Feature messaging. Это уровень HCA, ниже transport — отдельная ADR territory.

## Связано

- [[015-remote-modules]] — оригинальный контракт remote-загрузки
- [[053-app-as-remote-symmetry-and-config-channel|ADR 053]] — app-as-remote symmetry, `IRemoteBootstrap`
- [[056-web-remote-mf2-iframe-transport-hybrid|ADR 056]] — superseded direction (MF2 + iframe-transport)
- [[047-frontend-architecture-zones-cycle-vendor]] — zone canon (web-remote живёт в `packages/web/runtime/remote/`)
