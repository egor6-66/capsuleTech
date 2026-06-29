# Brief 1/2 — Theme-sync host→remote: APP-SIDE (web-core)

**Зона:** owner-web-core (`packages/web/runtime/core/`).
**Запуск:** `.\claude-scope.ps1 -Scope core` (или как зовётся scope web-core — leaf `core`).
**Тип:** commit-only.
**Порядок:** ЭТОТ бриф ПЕРВЫЙ. Brief 2 (web-remote) импортирует `EMBED_PROTOCOL.themeEvent`, добавленный здесь.

## Зачем

Встроенный remote (канвас) — отдельный cross-origin iframe со своим документом. Он тематизирован дефолтом (`data-theme="black"`), а хост — темой юзера → рассинхрон. Хост cross-origin **не может** дотянуться до DOM iframe'а, поэтому тему надо **слать сообщением**, а app-сторона (этот пакет, исполняется ВНУТРИ iframe) применяет её к своему документу через `@capsuletech/web-style` (зависимость уже есть).

Канон: тема = «эмбиент хоста» для ЛЮБОГО встроенного remote, не только канваса → синк живёт в инфре (web-core bootstrap + web-remote), апп/контракт канваса не трогаем. Едет **системным** событием `__capsule_theme__` (зарезервированный `__capsule_*` namespace, отдельный от contract-шины — host-inbound handler их и так исключает).

## Изменения

### 1. `src/bootstrap/embedHandshake.ts` — протокол + проброс
- В `EMBED_PROTOCOL` добавить:
  ```ts
  /** host→app: тема хоста (data-theme + dark). Системное, вне contract-шины. */
  themeEvent: '__capsule_theme__',
  ```
- В `IStartHandshakeOptions` добавить опцию:
  ```ts
  /** Вызывается на каждый __capsule_theme__ (initial + runtime). Применение — у вызывающего (createCapsuleApp). */
  onTheme?: (payload: { theme?: string; dark?: boolean }) => void;
  ```
- В `startHandshake` → `onMessage`, ПЕРЕД проверкой `configEvent` (после sessionId-фильтра), добавить ветку:
  ```ts
  if (msg.eventName === EMBED_PROTOCOL.themeEvent) {
    if (msg.payload && typeof msg.payload === 'object') {
      opts.onTheme?.(msg.payload as { theme?: string; dark?: boolean });
    }
    return;
  }
  ```
  **embedHandshake.ts остаётся web-style-free** (чистый протокол) — он лишь прокидывает payload в колбэк. Применение — в createCapsuleApp.

### 2. `src/bootstrap/createCapsuleApp.tsx` — применение через web-style
- Импорт: `import { setTheme, setDarkMode } from '@capsuletech/web-style';` (dep уже в package.json).
- В вызов `startHandshake({ params, onConfig, ... })` (embedded+params ветка, ~стр. 387) добавить:
  ```ts
  onTheme: (p) => {
    // Применяется к documentElement iframe'а (setTheme/setDarkMode default target).
    if (typeof p.theme === 'string') setTheme(p.theme);   // no-op на unknown theme (guard внутри)
    if (typeof p.dark === 'boolean') setDarkMode(p.dark);
  },
  ```
- Работает для ЛЮБОГО embedded-аппа (startHandshake в embedded+params ветке, НЕ гейтится контрактом). Standalone — не вызывается, канвас держит свой дефолт.

## Заметки
- `setTheme` персистит тему в localStorage iframe'а (после первого синка канвас помнит host-тему на релоаде — ок, без вспышки до black). Приемлемо.
- `data-theme`/`.dark` ставятся на `document.documentElement` (= html iframe'а). CSS-переменные тем уже в бандле канваса (`web-style/themes`).

## Verify (last-lines в отчёт)
- Тест `embedHandshake`: `__capsule_theme__` с payload → вызывает `onTheme(payload)`; чужой sessionId → игнор; configEvent по-прежнему работает.
- Тест `createCapsuleApp` (embedded): симулированный `__capsule_theme__` message → применена тема (spy на `setTheme`/`setDarkMode`, либо проверить `documentElement.getAttribute('data-theme')` / `.classList.contains('dark')`).
- `pnpm --filter @capsuletech/web-core test` + `build` + `pnpm exec biome check --write packages/web/runtime/core` + re-stage.
- Typecheck: `pnpm nx run web-core:typecheck`.

## Связано
[[reference_widget_store_arg_canon]], [[project_studio_canvas_remote_plan]]. Brief 2: `remote-theme-sync-2-remote.md`.
