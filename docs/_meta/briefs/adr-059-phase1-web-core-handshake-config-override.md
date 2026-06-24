---
tags: [web-core, adr-059, brief, phase-1, owner-web-core]
status: ready-for-owner
date: 2026-06-24
zone: owner-web-core
adr: 059-web-remote-app-mode-iframe-src-and-config-override
sequence: 1-of-3 (фундамент — должен лечь первым)
related:
  - 059-web-remote-app-mode-iframe-src-and-config-override
  - 013-explicit-define-app-config
  - 053-app-as-remote-symmetry-and-config-channel
---

# Brief 1/3 — web-core: embed-handshake + config-override (ADR 059 фундамент)

> [!info] Кому: **owner-web-core**, scope `core` (`claude-scope core owner-web-core`).
> Это **первый** из трёх брифов ADR 059 и **владелец протокола** — Brief 2 (builders+cli) и
> Brief 3 (web-remote) на него опираются. Прочитай `packages/web/runtime/core/OWNERSHIP.md` +
> ADR 059 + ADR 013/053. НЕ коммить до review архитектора (протокол согласуется до того, как
> зависимые брифы стартуют).

## Цель

Сделать запуск capsule-приложения **embed-aware невидимо для app-разработчика**: приложение
монтирует себя своим обычным entry; если оно оказалось внутри хост-iframe — фреймворк сам делает
handshake, принимает host-override config'а и мержит его в реактивный config-store **до** mount'а.
App-разработчик пишет только `capsule.app.ts` и читает `config.X` — никакого embedding-кода.

## Протокол (SOURCE OF TRUTH — Brief 2/3 ссылаются на этот раздел)

### Детект встраивания
`window.parent !== window` (приложение внутри iframe). Если не встроен — обычный путь, без postMessage.

### Сообщения (postMessage, наследуют envelope-форму ADR 053/058 `IRemoteMessage`)
1. **app→host `__capsule_app_ready__`** — приложение сообщает «я загрузился, монтируюсь, шли config».
   `window.parent.postMessage(...)`. Поля: `from`(app name из capsule.app.ts), `eventName`,
   `sessionId` (см. ниже про источник).
2. **host→app `__capsule_remote_config__`** — host шлёт **override-патч** (не полный config).
   Это уже существующий envelope (ADR 053). app мержит по правилам ниже.
3. После приёма первого config-патча (или таймаут) — приложение монтируется.

### Источник `sessionId`/`name` на стороне app — ФИКСИРОВАНО (контракт для Brief 2/3)
Хост проставляет в URL iframe **query-параметры**: `?__capsule_session=<id>&__capsule_name=<app>`.
Читаются app-entry'ем из `location.search` **синхронно** до первого postMessage (без гонки с
сообщениями). **Hash отвергнут** — конфликтует с роутером приложения. Brief 3 (host) ставит эти
query-параметры на `iframe src`, Brief 2 (entry) их читает. Префикс `__capsule_` — namespaced,
entry может вычистить их из URL после чтения.

### Config-override merge (семантика D4)
- База — `defineAppConfig` приложения (ADR 013, читается из `capsule.app.ts`).
- Патч от хоста — **per-key shallow merge поверх базы, host wins**. Отсутствующий у хоста ключ →
  остаётся app-дефолт.
- **Фильтр на приёме:** ключи не из схемы `defineAppConfig` — **молча отбрасываются** (хост может
  не знать, кого подключает). Никакого предобмена схемами.
- **Реактивно:** повторные `__capsule_remote_config__` в рантайме ре-мержат store, приложение
  реагирует штатной solid-реактивностью.
- **Таймаут-fallback:** если за N мс (предложи значение, ~1500мс) config не пришёл — монтируемся на
  app-дефолтах (медленный/нестандартный хост не вешает app).

## Где это живёт — ВСЁ IN-ZONE web-core (исправлено)

- `createCapsuleApp` (web-core/bootstrap) — точка, где app поднимает себя. Сюда встраивается
  embed-detect + handshake + «дождись config или таймаут → mount».
- База config'а — **`defineAppConfig` / `IAppConfig` в `packages/web/runtime/core/src/app-config.ts`**
  (твоя зона; ранее ошибочно приписано web-query — там `/app-config` subpath'а нет). Override-merge
  и реактивный config-store делаешь **целиком в web-core**, эскалация в web-query НЕ нужна.

## Push vs pull — РЕШЕНО: вариант (A), handshake заменяет push

`createCapsuleApp` сейчас принимает `configOverride`/`runtimeProps` (ADR-053 push: хост вызывает
bootstrap и инжектит config параметром), но `buildAppComponent` их не потребляет — **мёртвый
scaffold**. ADR 059 D5 ретайрит host-invoked bootstrap в app-режиме; web-remote (Brief 3) шлёт
override **только postMessage**. Поэтому:

- **Удаляешь `configOverride`/`runtimeProps` push-параметры** из сигнатуры `createCapsuleApp`.
  Единственный источник override — **postMessage-handshake (single source)**. Merge читает ТОЛЬКО
  postMessage — никакого двухисточникового дизайна (§1).
- **Известный консумер — архитектор разрулит сам, ты apps/ не трогаешь.** Факт (проверено
  архитектором): `apps/universal-canvas/src/remote.ts:51-52` передаёт `configOverride: ctx.config`
  + `runtimeProps: ctx.props` в `createCapsuleApp`. Оба поля уже мертвы в рантайме
  (`buildAppComponent` их не потребляет), но удаление сломает **typecheck** этого файла. Это
  cross-zone логическая единица (§0.1): **в одном PR** ты убираешь поля + реализуешь handshake,
  а **архитектор** делает минимальную правку `apps/universal-canvas/src/remote.ts` (убрать 2 строки
  51-52). `eventSink: ctx.channel` остаётся. Полный перевод remote.ts на self-mounting entry —
  Brief 2/3, не сейчас. Тебе достаточно: web-core green; apps/ правку приложит архитектор перед
  коммитом PR.

## Что НЕ трогать

- `solidBundleShim` (import-map) — его вывод из app-пути в Brief 3/web-remote; здесь не трогаем,
  но и не закладываемся на него.
- Host-side (`<Remote.View>`, отправка патча) — Brief 3/web-remote.
- Сборка app / генерация entry — Brief 2/builders.

## Тесты

- embed-detect: `window.parent === window` → standalone-путь (без postMessage, app-дефолты).
- handshake: эмулировать host (postMessage `__capsule_remote_config__` патчем) → config-store =
  base ⊕ patch; неизвестные ключи отброшены; mount после приёма.
- таймаут: патч не пришёл → mount на дефолтах через N мс.
- реактивность: второй патч в рантайме → store ре-мержится.
- merge unit'ы: per-key host-wins, отсутствующий ключ = дефолт, неизвестный = отброшен.

## Бар / возврат

`pnpm --filter @capsuletech/web-core test` + `build` green. Вернуть архитектору: **финальный
протокол** (точные имена/поля сообщений, источник sessionId/name, значение таймаута) — он станет
контрактом для Brief 2/3. НЕ коммить до согласования протокола.
