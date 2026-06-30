# Brief — `WebStudio.Styles` модуль: canvas theme/dark override

**Owner:** owner-studio · **Zone:** `packages/web/studio/` · **Group:** web_base
**Architect-собрано:** 2026-06-30 · факты, не гипотезы — проверены по коду.

## Цель

Отдельный **модуль-панель** студии для переключения **глобальной темы канваса** (remote `universal-canvas`) независимо от темы хрома самой студии. Панель — в стилистике остальных модулей (Info/Tree/Palette), **НЕ дропдаун**.

## Ключевой факт: override-провод remote УЖЕ готов

Проверено по коду — **owner-web-remote трогать НЕ нужно**:

- `packages/web/runtime/remote/src/interfaces.ts:141-142` — `IRemoteComponentProps` имеет `theme?: string; dark?: boolean`.
- `interfaces.ts:199-200` — типизированный `IRemoteViewProps<N>` тоже (known-name path).
- `runtime/RemoteComponent.tsx:113-114` — `theme = () => rawProps.theme ?? hostTheme()`, `dark = () => rawProps.dark ?? hostDark()`. **`undefined` → наследует host-тему** (то самое поведение #453, "ремоут ловит тему хоста").
- `RemoteComponent.tsx:238-246` — реактивный effect ре-шлёт envelope при смене `theme()`/`dark()` (post-mount override долетает).

→ Достаточно передать `theme`/`dark` в `<Remote>` — провод сам форвардит в iframe через `__capsule_theme__`.

## Gap (ровно один)

`packages/web/studio/src/canvas/Canvas.tsx:30` рендерит `<Remote name={canvasName} instanceId="main" />` **без** `theme`/`dark` → канвас всегда на host-теме.

## Что сделать (всё в зоне owner-studio)

### 1. SSOT-синглтон `src/styles/canvas-theme.ts`

Паттерн — копия `src/selection.ts` (singleton Solid-store + `use*`-hook, без Provider'а; все модули читают/пишут глобально).

```ts
// undefined = наследовать тему/режим хоста (host fallback в RemoteComponent)
interface ICanvasThemeState { theme?: string; dark?: boolean }
```

Hook `useCanvasTheme()` экспортит: `theme()`, `dark()`, `setTheme(name | undefined)`, `setDark(v | undefined)`, `reset()` (оба → undefined = "наследовать host").

- **Не персистить** в v1 (как `selection.ts` — in-memory; canvas-override это design-time сессия). Если решишь иначе — отдельный ключ, **не** трогай `capsule-theme` (это host).
- **НЕ вызывать** `web-style.setTheme` — это сменило бы host-тему (хром студии). Override живёт только в этом синглтоне.

### 2. `Canvas.tsx` прокидывает override

```tsx
const ct = useCanvasTheme();
// ...
<Remote name={canvasName} instanceId="main" theme={ct.theme()} dark={ct.dark()} />
```
`undefined` безопасен — RemoteComponent делает `?? hostTheme()`. Реактивность: getter'ы трекаются, смена → ре-send envelope.

### 3. Модуль-панель `src/styles/StylesPanel.tsx` (+ `index.ts`)

Connected-панель (как `InfoPanel`/`TreePanel`). **Панель, не дропдаун.**

- **Список тем**: `DISCOVERED_THEMES` из `@capsuletech/web-style` (dep уже есть, см. package.json). Рендерь строками-кнопками (active = чек-маркер `✓`, как делает `web-shell ThemePicker` items `themePicker.tsx:49-68`, **но своей панелью** — dropdown не импортируй). Клик → `ct.setTheme(name)`.
- **Dark-toggle**: `@capsuletech/web-ui/toggle` `<Toggle>` → `ct.setDark(checked)`.
- **Reset / "наследовать host"**: кнопка/affordance → `ct.reset()` (тема канваса = host).
- **Chrome — web-ui напрямую** (List/Button/Toggle/Flex/Typography), по правилу двух китов (chrome = `@capsuletech/web-ui`, `useWebStudioKit()` тут НЕ нужен — это не контент-рендер).
- **Контракт-референс**: shell `ThemePicker` `value`/`onSelect`-инъекция (`themePicker.tsx:33-69`, `interfaces.ts`) — паттерн state-injectable, docstring прямо упоминает "canvas-local theme overrides in studio". Идею берём, dropdown-UI — нет.

### 4. Регистрация в `src/capsule.ts`

Добавь `Styles: StylesPanel` в `components`. Обнови doc-comment (список `WebStudio.*` глобалов). **Нового vite-entry НЕ надо** — connected-модули (Info/Tree/Provider) идут через `capsule.ts`, а не subpath (vite.config.mts entries: index/manifests/capsule/palette только).

### 5. Тесты

- `styles/__tests__/canvas-theme.test.ts` — синглтон: set/reset/undefined-fallback семантика.
- `styles/__tests__/StylesPanel.test.tsx` — рендер списка из мок-DISCOVERED_THEMES, active-checkmark по `theme()`, клик → setTheme, toggle → setDark, reset → undefined. (jsdom, как `EditorOverlay.test.tsx`.)

## Границы

- **НЕ трогать** `packages/web/runtime/remote/*` (провод готов), `packages/web/runtime/style/*` (берём только `DISCOVERED_THEMES`), `packages/web/domain/shell/*` (берём контракт-идею, не код).
- Playground-обвязка (`Widgets.Studio.Styles` + слот в layout) — **architect/framework-dev**, не owner-studio. Делается отдельно после landing'а модуля.

## Известное ограничение (записать в OWNERSHIP/quirks)

`DISCOVERED_THEMES` = темы, забандленные в **host** web-style. Если canvas-app бандлит другой набор тем — список может разойтись. В v1 принимаем (оба используют один `@capsuletech/web-style` glob). Future: тянуть доступные темы из манифеста canvas-remote.

## Definition of done

1. Tests green (`pnpm --filter @capsuletech/web-studio test`).
2. Сборка пакета ок (`pnpm --filter @capsuletech/web-studio build`) — все entries в dist.
3. `WebStudio.Styles` зарегистрирован; смена темы в панели → канвас (iframe) меняет тему, хром студии — нет.
4. OWNERSHIP.md / `docs/_meta/studio.md` — добавить модуль Styles + quirk (можно отдельным docs-проходом architect'а).
