# Brief 2/2 — Theme-sync host→remote: HOST-SIDE (web-remote)

**Зона:** owner-web-remote (`packages/web/runtime/remote/`).
**Запуск:** `.\claude-scope.ps1 -Scope remote` (leaf web-remote → `remote`).
**Тип:** commit-only.
**Порядок:** ПОСЛЕ Brief 1 (web-core) — он добавляет `EMBED_PROTOCOL.themeEvent`, который здесь импортируется. Если запускается параллельно — typecheck до мержа core может ругнуться на отсутствующий `themeEvent`; согласовать порядок мержа (core → remote).

## Зачем

Хост-сторона форвардит тему встроенному remote'у системным событием `__capsule_theme__` с `{ theme, dark }`. Канвас (cross-origin iframe) применяет её сам (Brief 1, web-core в iframe). Тема-синк станет бесплатной для всех будущих remote'ов.

**Источник темы = опц. оверрайд ИЛИ глобальная тема хоста:**
- проп `theme`/`dark` НЕ задан → шлём глобальную тему хоста (`useTheme()`/`useDarkMode()` из `@capsuletech/web-style`, реактивные сигналы) — дефолтный синк, потребитель ничего не делает;
- проп задан → шлём его (per-remote оверрайд; напр. студия захочет задавать тему канваса из своего UI отдельно от темы хрома).

Это `theme = props.theme ?? useTheme()` — одно поведение, не два режима.

## Изменения

### 1. `package.json` — новый dep
Добавить `"@capsuletech/web-style": "workspace:*"` в `dependencies`. (Новое ребро web-remote → web-style; цикла нет — web-style низкоуровневый styling-лист. Версия workspace:* — синк тривиален; флажок owner-deps на учёт ребра.)

### 2. `src/interfaces.ts` — опц. оверрайд-пропсы (System-класс)
В `IRemoteComponentProps` добавить (рядом с System-пропсами `name`/`instanceId`/`fallback`/`mode`):
```ts
/**
 * Опц. оверрайд темы remote'а. НЕ задан → remote наследует глобальную тему
 * хоста (useTheme/useDarkMode). Задан → форвардится вместо неё (per-remote
 * оверрайд, напр. студия задаёт тему канваса отдельно от темы своего хрома).
 * Host-side wire (как `config`) — НЕ часть config-envelope, едет в __capsule_theme__.
 */
theme?: string;
dark?: boolean;
```

### 3. `src/runtime/RemoteComponent.tsx` — отправка темы (зеркалит config-envelope)
- Импорты: `import { useTheme, useDarkMode } from '@capsuletech/web-style';` (`EMBED_PROTOCOL` уже импортирован).
- В теле компонента (scope, рядом с `transport`/`instanceId`) — источник с оверрайдом:
  ```ts
  const hostTheme = useTheme();     // Accessor<string>
  const hostDark = useDarkMode();   // Accessor<boolean>
  // проп-оверрайд ?? глобальная тема хоста. Геттеры — реактивны и к пропу, и к сигналу.
  const theme = () => rawProps.theme ?? hostTheme();
  const dark = () => rawProps.dark ?? hostDark();
  ```
- Хелпер рядом с `sendConfigEnvelope` (~стр. 129) — **тот же envelope-механизм**:
  ```ts
  const sendThemeEnvelope = (t: ITransport = transport()!) => {
    t.send({
      from: EMBED_PROTOCOL.hostTarget,
      fromInstance: EMBED_PROTOCOL.hostTarget,
      to: rawProps.name,
      toInstance: instanceId,
      sessionId: rawProps.sessionId,
      eventName: EMBED_PROTOCOL.themeEvent,
      payload: { theme: theme(), dark: dark() },
    });
  };
  ```
- **На ready** — рядом с `sendConfigEnvelope(t)` в ready-handshake effect (~стр. 171, ветка `readyEvent`):
  ```ts
  sendConfigEnvelope(t);
  sendThemeEnvelope(t);   // ← добавить: начальная тема, как только app-listener поднят
  ```
- **Реактивно на смену темы** — отдельный effect, зеркало reactive-config (~стр. 207):
  ```ts
  // Re-send при смене темы хоста ИЛИ оверрайд-пропа (post-ready изменения долетают).
  createEffect(() => {
    const t = transport();
    if (!t) return;
    sendThemeEnvelope(t);   // читает theme()/dark() → подписка на проп + хост-сигнал
  });
  ```
  (Pre-ready реактивные посылки теряются — безвредно; начальную тему гарантирует ready-send выше. Тот же паттерн, что у config.)

## Заметки
- `__capsule_theme__` ∈ зарезервированный `__capsule_*` namespace — он host→app (`from: __host__`), поэтому app→host event-router (`msg.from !== rawProps.name`) его и так не зацепит; в `RESERVED_EVENTS` добавлять НЕ нужно.
- Transport.send cross-origin постит в `iframe.contentWindow` (postMessage origin не требует same-origin) — как config.

## Verify (last-lines в отчёт)
- Тест `RemoteComponent` (default): после `__capsule_app_ready__` среди отправленных — envelope `eventName === EMBED_PROTOCOL.themeEvent` с `payload.theme`/`payload.dark` = глобальная тема хоста; при смене хост-сигнала — повторная отправка.
- Тест `RemoteComponent` (override): с `theme="..."`/`dark={...}` пропсами — envelope несёт оверрайд, НЕ хостовую; при смене пропа — повторная отправка.
- `pnpm --filter @capsuletech/web-remote test` + `build` + `pnpm exec biome check --write packages/web/runtime/remote` + re-stage.
- `pnpm install` после правки package.json (symlink web-style в node_modules).
- Typecheck: `pnpm nx run web-remote:typecheck` (нужен смерженный/собранный web-core с `themeEvent`).

## Связано
[[project_studio_canvas_remote_plan]]. Brief 1 (предусловие): `remote-theme-sync-1-core.md`.
