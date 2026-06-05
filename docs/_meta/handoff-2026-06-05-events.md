---
tags: [meta, handoff]
date: 2026-06-05
---

# Handoff — 2026-06-05 (typed package events + Shell.Header composition)

Вторая сессия за день (первая — `handoff-2026-06-05.md`, typing Track #2). Здесь: Matrix
переехал в web-shell, split layout-modes, типизированный контракт пакетных событий
(ADR 032), Shell.Header как composable, settings-overlay редизайн. Всё в `main`.

## TL;DR — что сделано (всё смержено)

1. **Matrix → @capsuletech/web-shell** (вынесен из web-ui, декомпозирован на модули
   cell/rows/content/mode/dnd/presets). web-ui снова чистый stateless-kit (drop web-dnd).
   Приходит в апп глобалом `Shell.Matrix` (ADR 033 packages-регистрация в capsule.app.ts).
2. **Split layout-mode** (web-style): `layoutMode: view|edit` → два независимых сигнала
   `useResizeMode()` + `useDndMode()` (default true). Toggle свёрнут в один `Shell.ModeToggle`
   (mode="dnd"/"resize"/"settings"/"dark") в web-shell. Matrix props: `resize?`/`dnd?` +
   sugar `mode="view"|"edit"`. per-cell draggable/resizable — **opt-out** (default true).
3. **Типизированный контракт пакетных событий (ADR 032)** — главное:
   - web-core: `EventsOf<C>` (глобал, рядом с `CtxOf`/`StoreOf`), `IHandlerApi<TCtx,TPayload>`,
     `ITarget<TPayload>` + `ITarget.source`, `IDefineStateSchema<TCtx,TEvents>` (conditional:
     без TEvents — открытая форма/backward-compat; с TEvents — closed mapped → typed payload).
     `Feature`/`Controller` += первый generic `TEvents`.
   - web-shell: `Controllers.Shell.Matrix` — **ПРОЗРАЧНАЯ emit-проводка** (рендерит raw Matrix +
     `useEmit` в ближайший контроллер аппа, БЕЗ своего store/Context → слот-контент видит
     родительский store, затенения нет). Эмитит `onLayoutChange`. `IMatrixEvents` + phantom
     `__events` + namespace-merge `shell-events.d.ts` → `Shell.Matrix.Events`.
   - app-DX: `Feature<Shell.Matrix.Events>((s)=>({ onLayoutChange:({target})=>target.payload }))`
     — `target.payload` типизирован как `LayoutChangeEvent`, БЕЗ импортов/аннотаций.
4. **`Shell.Header` — compound composable** (НЕ config-blob): `Shell.Header` bar +
   `Shell.Header.Navigation` (батч-контейнер как `ui.Group`, кормится Shape'ом) +
   `Shell.Header.Menu` (dropdown, Menu-иконка из ui-kit). Используется как ui-композиция.
5. **ewc consumption (эталон, ноль импортов):** `Shapes.ShellNavigation` (nav через
   `Shell.Header.Navigation`, роутинг `ui.Link`), `Widgets.Header` (композиция: Shell.Header +
   Shapes + Shell.ModeToggle/ThemePicker + `Ui.Button meta={{tags:['logout']}}` → UiProxy →
   `Features.Workspace`), `Features.Shell` (`Feature<Shell.Matrix.Events>` → persist раскладки в
   localStorage). Старые headers/main + workspaceMenu + Shapes.Navigation удалены.
6. **Декларативные widget-settings** (раньше в сессии): `Widget(content, { loader?, settings? })`,
   `ISetting` toggle-дескриптор, web-core рендерит settings-strip при settingsMode.

## ⚠️ Открытые items (next agent — ПРОВЕРИТЬ В БРАУЗЕРЕ)

jsdom не меряет stacking/визуал — оба требуют реального браузера (ewc `localhost:3000`).

1. **Баг с drag-badge (z-index/stacking).** Симптом был: grip-badge `⠿` перекрывался рядами
   DataTable. Фикс применён (`8f3b46d`, `packages/web/shell/src/matrix/cell.tsx`): убрал
   `overflow-auto` с outer-`<Dynamic>` ячейки (он создавал stacking-context, запиравший badge
   `z-30`); скролл остался на inner div. **НУЖНО подтвердить в браузере**, что badge теперь
   поверх таблицы И что скролл/resize/virtualizer ячейки не сломались (CLAUDE.md known-issue про
   DataTable definite-height — следить, не вернулся ли пустой body).
2. **Дизайн settings-overlay виджета.** Фикс применён (`958d94f`,
   `packages/web/core/src/wrappers/widget.tsx`): frosted floating overlay (`bg-background/85` +
   `backdrop-blur-md` + `shadow-lg` + `rounded-b-md`, pill-тогглы primary/muted). **Нужна
   browser-проверка + возможная доводка.** Пользователь показывал референс (карточка «Noties»):
   хотел полупрозрачный затемнённый под тему фон + **иконка** на пункте. Иконки пока НЕ сделаны —
   нужен `ISetting.icon` + **import-free** резолв иконки (app-конфиг не должен импортить lucide;
   вариант — icon-by-name строка, web-core/ui-kit резолвит). Обсудить механику с пользователем.

## Архитектурные принципы (зафиксированы в этой сессии)

- **Пакет используется как ui-композиция** — `Shell.Matrix`/`Shell.Header.Navigation`
  композируются и кормятся Shape'ами ровно как `ui.*`. Не config-blob'ы.
- **Прозрачные пакетные контроллеры** для блоков, ХОСТЯЩИХ app-контент (Matrix слоты): эмитят в
  ближайший контроллер, своего store не создают (иначе затеняют). Контроллеры, владеющие своим
  поддеревом (Editor.Provider) — могут провайдить контекст.
- **Композиция фич:** ловец-событий СНАРУЖИ (events всплывают через `next()`), data-фича БЛИЖЕ к
  своим виджетам (nearest store). См. dashboard: `Features.Shell` → `Features.Incidents` → Matrix.
- **App-код = глобалы, НИКАКИХ import** (эталон ewc). import в app-файле = framework gap.
- Типизация контекста ПРЯМО в handler-параметре в TS невозможна (circular inference + index-sig) —
  context читаем через `store`, payload событий типизируется через `Feature<...Events>`.

## Состояние репо

- Всё в **main** (PR develop→main смержен, develop удалён). Только `main`.
- ⚠️ `nexus-uk.conf` (WireGuard VPN-конфиг с приватным ключом) был случайно застейджен и попал в
  один коммит — убран через amend ДО пуша (ключа НЕТ в истории, проверено `git log --all`).
  В `.gitignore` добавлены `*.conf`/`*.ovpn`. На будущее: НИКОГДА не `git add` широко возле root.
- web/agent + testhub — параллельная работа других зон, уже в истории.
