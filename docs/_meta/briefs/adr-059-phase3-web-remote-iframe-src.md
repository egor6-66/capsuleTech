---
tags: [web-remote, adr-059, brief, phase-3, owner-web-remote]
status: ready-for-owner
date: 2026-06-24
zone: owner-web-remote
adr: 059-web-remote-app-mode-iframe-src-and-config-override
sequence: 3-of-3 (зависит от протокола Brief 1 + entry Brief 2)
related:
  - 059-web-remote-app-mode-iframe-src-and-config-override
  - 058-web-remote-message-only-mode-by-intent
---

# Brief 3/3 — web-remote: app-mode = iframe-src, выпил srcdoc/boot/import-map (ADR 059)

> [!success] READY — Brief 1 (web-core handshake) + Brief 2 (builders entry) смержены в main.
> Факты, на которые опираешься (проверено architect'ом):
> - **`EMBED_PROTOCOL`** импортится из `@capsuletech/web-core/bootstrap` (опубликован): `readyEvent`
>   `__capsule_app_ready__`, `configEvent` `__capsule_remote_config__`, `hostTarget` `__host__`,
>   `query.session` `__capsule_session`, `query.name` `__capsule_name`. **Бери имена ОТТУДА, не хардкодь.**
> - **App уже сам монтируется embed-aware.** `.capsule/index.ts` теперь `createCapsuleApp('root', {...})`
>   (Brief 2). `createCapsuleApp` детектит iframe, читает query, шлёт `__capsule_app_ready__`, ждёт
>   `__capsule_remote_config__` (или 1500мс таймаут), мержит, монтирует. **Хосту НЕ надо инжектить
>   boot.js / вызывать bootstrap** — достаточно загрузить URL приложения в iframe с query-параметрами.

> [!info] Кому: **owner-web-remote**, scope `remote` (`claude-scope remote owner-web-remote`).
> Прочитай `packages/web/runtime/remote/OWNERSHIP.md` + ADR 059 + ADR 058. НЕ коммить до review.
> **Зона строго web-remote.** Снос orphan-машинерии в ЧУЖИХ зонах (RemoteManifestPlugin/remote-entry
> в vite-builder, `solidBundleShim` в web-core, `apps/universal-canvas/src/remote.ts`) — НЕ твоё:
> это cross-zone cleanup, architect координирует **после** browser-verify (см. секцию внизу). Ты
> только перестаёшь их ИСПОЛЬЗОВАТЬ из web-remote; удаление их источников — отдельный заход.

## Цель

Перевести `mode: 'app'` с inline-srcdoc + boot-shell + shared-solid import-map на чистый
**`<iframe src={app URL}>`**: хост грузит приложение как самостоятельное, общается только postMessage.

## Scope

1. **app-путь → `<iframe src>` = КОРНЕВОЙ index приложения + query (ФИКСИРОВАНО, проверено кодом).**
   Embeddable-entry — это обычный root-index приложения, НЕ выделенный `/embed`-route:
   `.capsule/index.html` (`<div id="root">` + `<script src="index.ts">`) сервится Vite в корне
   origin'а; `index.ts` → `createCapsuleApp('root', …)` → embed-detect читает `location.search`.
   `module.url` = origin приложения (напр. `http://localhost:3000`). Строй URL робастно через `new URL`:
   ```ts
   const src = new URL('/', module.url);
   src.searchParams.set('__capsule_session', sessionId);   // ключи — из EMBED_PROTOCOL.query
   src.searchParams.set('__capsule_name', name);
   // <iframe src={src.href} ...>
   ```
   (ключи бери из `EMBED_PROTOCOL.query`, не литералами.)
2. **Удалить из app-пути:**
   - `src/runtime/buildSrcdoc.ts` (+ тест) — генерация srcdoc больше не нужна в app-режиме;
   - `src/shell/boot.ts` (+ тест) — host-injected module-resolution шелл;
   - инжект import-map / любые ссылки на `renderSolidImportMapTag`/`solidBundleShim` из app-пути;
   - `remote-entry`-as-bundle ожидания (manifest `entry` под bundle).
   Если что-то из этого нужно зарезервировать под будущий `component`-режим — **изолировать под
   явный seam**, а не оставлять в app-пути (но component не реализуем — ADR 058 D3).
3. **Host шлёт config-override патч.** Существующий `sendConfigEnvelope` (envelope
   `__capsule_remote_config__`) сохраняется как способ доставки host-override (Brief 1 D4). Убедиться,
   что отправка привязана к app-`__capsule_app_ready__` (handshake Brief 1), а не к старому
   `__capsule_remote_ready__` boot-shell'а.
4. **Манифест — убери fetch в web-remote (только потребление, не источник).** В iframe-src модели
   хосту манифест не нужен (URL + query + postMessage). Убери `createResource` manifest-fetch из
   app-пути `RemoteComponent`. Генератор `RemoteManifestPlugin` (vite-builder) и `capsule.manifest.json`
   **не трогай** — это чужая зона, осиротеет и снесётся в cleanup-заходе. Деградация при недоступном
   приложении — **timeout-based на `__capsule_app_ready__`** (manifest.error как источник уходит).
   `iframe.onerror` на HTTP/cross-origin ошибки документа часто НЕ срабатывает — на него не
   полагаться (можно повесить best-effort вторичным триггером). Механика: на mount iframe заводишь
   host-side таймаут (~5000мс — щедро на сетевую загрузку + boot приложения; это НЕ 1500мс app-config-wait
   из Brief 1, другой таймер); пришёл `__capsule_app_ready__` → app жив, таймаут снять; не пришёл за N
   → плейсхолдер `[data-capsule-remote-error]` (переиспользуй из dfc89ba). `loading`-state на время
   ожидания app_ready — ок (fallback `'loading'`).
5. **Cross-origin (открытый вопрос ADR 059, не блокер):** `sandbox`-флаги и ужесточение
   `postMessage` targetOrigin с `'*'` до известного origin — можно отдельным шагом, отметить TODO.

## Что НЕ трогать

- Протокол/merge — Brief 1 (web-core). Здесь только host-side iframe + отправка патча.
- Генерация app-entry / сборка — Brief 2 (builders).
- `mode: 'component'` — отложен (ADR 058 D3).
- Public API (`<Remote.View>`/`Provider`/`useRemote`/`mode`-проп) — без изменений.

## Тесты

- app-режим рендерит `<iframe src=...>` с корректным URL (+ sessionId/name по протоколу).
- больше нет srcdoc/boot/import-map в app-пути (grep: 0 вхождений `buildSrcdoc`/`solidBundleShim`/
  `renderSolidImportMapTag` в app-ветке).
- недоступное приложение → плейсхолдер, не краш (сохранить покрытие из dfc89ba, адаптировать под
  iframe `onerror`/таймаут вместо manifest-fetch).
- config-патч уходит после `__capsule_app_ready__`.

## Browser-verify (после всех трёх — owner-tests, реальный браузер)

`apps/universal-canvas` встраивается в хост через iframe-src, **рендерится** (не белый экран),
host-override config'а применяется (напр. apiUrl), события canvas→host идут, редиректа нет.
jsdom недостаточно (память `feedback_verify_in_browser_dont_guess`).

## Cross-zone cleanup (СЛЕДУЮЩИЙ заход — architect-coordinated, НЕ в этом брифе)

После того как iframe-src путь подтверждён browser-verify'ем, architect координирует снос
осиротевшей old-машинерии (каждый в своей зоне):
- **vite-builder** (owner-builders): `RemoteManifestPlugin`, генерация `remote-entry.ts`, `Bootstrap`
  export (RETIRE-маркер уже стоит) — убрать.
- **web-core** (owner-web-core): `solidBundleShim` (`renderSolidImportMapTag`/`buildSolidImportMap`) —
  убрать, если ни один потребитель не остался.
- **apps/universal-canvas** (architect/framework-developer): `src/remote.ts` push-entry — удалить.

Порядок: сначала твой web-remote iframe-src + browser-verify (этот бриф) → потом cleanup. Не наоборот
(не сносим старое, пока новое не доказано в браузере).

## 🟡 ОТКРЫТЫЙ ВОПРОС — extra-props (A/B), решить ПЕРЕД мержем

D4 («нет отдельных props, всё host→app = config») реализован в варианте **(B)**: мёртвый props-канал
(`__capsule_remote_props__`, `sendPropsEnvelope`, `stripReserved`) удалён ✅; `sendConfigEnvelope`
мержит `{...providerConfig, ...module.config, ...config}` (override только через `config`-проп);
`interfaces.ts` **задокументирован** — «extra non-reserved/non-on* props accepted by the type but
ignored at runtime — pass such data through `config`». Поведение документированное, не silent.

`[key: string]: unknown` оставлен сознательно — он **нужен для `on*`-событий** (динамические ключи),
полностью убрать тип нельзя. Поэтому «строгое отклонение лишних пропов на уровне типа» невозможно;
выбор сводится к тому, что делать с extra non-on* пропами в рантайме:

- **(B) — текущее.** Игнорировать + документировать; override только через `config={{…}}`. Чисто,
  explicit, без магии. Минус: `<Remote.View apiUrl="…">` тип проглотит, но рантайм проигнорит — лёгкий
  footgun (смягчён доком).
- **(A) — альтернатива (ранний дизайн пользователя).** Свернуть extra non-on* пропы в config-патч:
  `<Remote.View apiUrl="…">` работает (apiUrl → config-override, схема-фильтр на приёме отбросит
  незнакомое). Эргономика «пропы Remote.View = config». **Фикс:** вернуть `stripReserved` (strip
  reserved/internal/on*) и домешать в `merged`. Минус: любой проп неявно становится config-ключом.

Architect-рекомендация: исходно склонялся к **(A)** (кейс карты — `apiUrl`/маркеры как пропы), но (B)
тоже валиден и уже сделан/задокументирован. Решение пользователя **отложено** (продолжение с другой
машины). До решения **этот PR не мержить** — оставлен draft'ом как checkpoint.

## Возврат

`pnpm --filter @capsuletech/web-remote test` + `build` green. Вернуть архитектору diff-summary +
результат browser-verify (или пометку, что нужен прогон owner-tests в реальном браузере). НЕ коммить
до review.
