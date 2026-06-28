# Brief — FIX: Widget-wrapper двоит контент (owner @capsuletech/web-core)

**Зона:** `packages/web/runtime/core/src/wrappers/widget.tsx`. **Приоритет: P0** — баг бьёт КАЖДЫЙ Widget во всех аппах.

## Корень (подтверждён трейсом + чтением исходника)

`WidgetWrapper` вызывает `Component(proxiedUi, store, wrapperProps)` в **ДВУХ** местах:
- `widget.tsx:93` — `fallback` внутреннего `<Show when={showSettings()}>` (нормальный путь),
- `widget.tsx:106` — внутри `<div>` (settings-overlay путь).

Оба — под вложенными `<Show>` на **реактивных** сигналах (`isLoading()` = `store?.loading`; `showSettings()` = `settingsMode()` из web-style + settings + store). Из-за дубль-call-site (eager-eval `fallback`-выражения и/или флипа сигнала на маунте) **контент инстанцируется дважды** → `mount ×2 / dispose ×1` (churn, нетто 1).

**Диагностика bug A (remote→host доставлялся дважды):** Widget(Canvas) → 2× `<Remote.View>` → 2 `RemoteComponent` → 4 подписки транспорта на 1 канвас → 1 сообщение = 2 `receive`. Убрали Widget (Remote.View напрямую) → 1 `receive`. Полный трейс-разбор: [[062-runtime-observability-trace-channel]] + checkpoint.

**Эталон рядом:** `page.tsx:42`, `view.tsx:26`, `shape/wrapper.tsx:182` вызывают контент **ровно один раз** — они НЕ двоят. Только Widget. Controller/Feature эмпирически чисты.

## Что сделать

Сделать так, чтобы `Component(...)` инстанцировался **ровно один раз** на маунт Widget, при этом **сохранив** оба режима (loader через `options.loader`, settings-overlay через `showSettings()`).

Канон-направление (owner решает точную форму, ты знаешь Solid + зону): инстанцировать контент **единожды** и переиспользовать ссылку в обеих ветках — напр. Solid `children()` helper:
```ts
const content = children(() => (Component as IWidgetRenderer)(proxiedUi, store, wrapperProps));
```
и подставлять `{content()}` в нормальной и в settings-ветке вместо повторного вызова `Component(...)`. Один инстанс «переезжает» между ветками при тоггле (это даже лучше текущего ремаунта).

**Ограничения (НЕ сломать):**
- Loader-ветка (`isLoading()`) и settings-overlay (`showSettings()`) должны работать как раньше (DOM-структура settings-пути: `relative` root + `absolute inset-0 overflow-auto` wrapper — сохранить, это нужно для definite-height виртуалайзеров, см. коммент в файле).
- Toggle-stability: не вводить новый гейт, который флипает ФОРМУ при изменении сигналов (родственно boost-layout toggle-stability contract).
- `UiProxy`/`ShapeUiContext.Provider` поведение не менять.

## Проверка (обязательно)

1. **Регресс-тест:** Widget с фабрикой-счётчиком — фабрика-контент вызывается **ровно 1×** на маунт (и в normal, и при loader/settings). Добавь в `wrappers/__tests__/`.
2. `pnpm --filter @capsuletech/web-core test` + `build` — вернуть последние строки.
3. **Браузер-верификация (architect снимет):** вернуть `<Widgets.Studio.Canvas/>` в `apps/playground/.../workspace/index.tsx` (сейчас там временный обход — Remote.View напрямую) → клик canvas-кнопки = **1** `remote.component:receive`, `deliver subscribers:2`.

## НЕ делать
- Не трогать apps/* (обход вернёт architect при верификации).
- Push не делать — commit-only (запушу я).
