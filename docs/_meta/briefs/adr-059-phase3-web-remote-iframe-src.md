---
tags: [web-remote, adr-059, brief, phase-3, owner-web-remote]
status: blocked-on-brief-1
date: 2026-06-24
zone: owner-web-remote
adr: 059-web-remote-app-mode-iframe-src-and-config-override
sequence: 3-of-3 (зависит от протокола Brief 1 + entry Brief 2)
related:
  - 059-web-remote-app-mode-iframe-src-and-config-override
  - 058-web-remote-message-only-mode-by-intent
---

# Brief 3/3 — web-remote: app-mode = iframe-src, выпил srcdoc/boot/import-map (ADR 059)

> [!warning] BLOCKED на Brief 1 (web-core, протокол handshake) и Brief 2 (builders, embeddable-entry).
> Старт только после того, как они зафиксированы/смержены: хост должен слать config-патч и
> проставлять `sessionId`/`name` в формате, который ждёт app-entry.

> [!info] Кому: **owner-web-remote**, scope `remote` (`claude-scope remote owner-web-remote`).
> Прочитай `packages/web/runtime/remote/OWNERSHIP.md` + ADR 059 + ADR 058. НЕ коммить до review.

## Цель

Перевести `mode: 'app'` с inline-srcdoc + boot-shell + shared-solid import-map на чистый
**`<iframe src={app URL}>`**: хост грузит приложение как самостоятельное, общается только postMessage.

## Scope

1. **app-путь → `<iframe src>`.** В `RemoteComponent` для `mode==='app'` рендерить
   `<iframe src="${module.url}/<embeddable-entry-path>?__capsule_session=<sessionId>&__capsule_name=<name>">`
   (путь — из Brief 2; query-параметры — контракт Brief 1, entry читает их синхронно).
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
4. **Манифест.** Согласовать с Brief 2/архитектором: если `capsule.manifest.json` в app-режиме
   уходит (entry = URL, не bundle), убрать manifest-fetch из app-пути `RemoteComponent`
   (createResource). Градеграция при недоступном приложении: iframe `onerror`/таймаут → плейсхолдер
   (адаптировать существующий `[data-capsule-remote-error]` из fix dfc89ba — он остаётся валиден).
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

## Возврат

`pnpm --filter @capsuletech/web-remote test` + `build` green. Вернуть архитектору diff-summary.
НЕ коммить до review.
