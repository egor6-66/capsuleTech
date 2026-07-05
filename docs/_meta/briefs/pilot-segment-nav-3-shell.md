# Brief 3/4 — web-shell: SegmentNav + Launcher connected-блоки (scope `shell`)

**Пилот дедупа Nav/Welcome (канон [[feedback_product_wide_kit_layering]]).** shell = потребитель web-ui + web-router: собирает **connected app-блоки** из stateless-визуала (web-ui) + path-хелпера (web-router) + emit. Ждёт brief 1 (web-router `useActiveSegment`) + brief 2 (web-ui `SegmentedBar`/`Launcher`).

## Единое generic-событие (решение user)
Вместо per-nav событий (`onLibraryNavigate`/`onLessonsNavigate`/`onNavigate`) — ОДНО:
```ts
export interface ISegmentNavEvents {
  /** Клик по сегменту nav'а. `nav` — дискриминатор источника, `segment` — id. */
  onSegmentNavigate: { nav: string; segment: string };
}
```
App-Feature различает по `payload.nav`. Payload схлопывания нет (дискриминатор внутри).

## `SegmentNav`
```tsx
export interface ISegmentNavProps {
  segments: readonly { id: string; label: string }[];
  nav: string;                    // дискриминатор ('library'|'lessons'|...)
  class?: string;
}
```
Композиция: `useEmitOptional()` (НЕ useEmit — может рендериться вне host-scope, прецедент Picker) + `useActiveSegment(segments.map(s=>s.id))` (web-router) →
```tsx
<SegmentedBar
  items={segments}
  activeId={active()}
  onSelect={(id) => emit('onSegmentNavigate', { source: 'Shell.SegmentNav', payload: { nav: props.nav, segment: id } })}
  class={props.class}
/>
```
Phantom `__events?: ISegmentNavEvents` для codegen `Shell.SegmentNav.Events`.

## `Launcher` (connected-обёртка над web-ui Launcher)
```tsx
export interface IShellLauncherProps {
  segments: readonly { id: string; label: string; description?: string }[];
  nav: string;
  title?: string; description?: string; hint?: string;
}
```
Композиция: web-ui `Launcher` + `useEmitOptional` → `onSelect={(id)=>emit('onSegmentNavigate',{source:'Shell.Launcher',payload:{nav:props.nav,segment:id}})}`. То же событие `onSegmentNavigate`.

## Регистрация
`src/capsule.ts` — добавить `SegmentNav`, `Launcher` в `Shell.*` глобалы. Subpath `@capsuletech/web-shell/ui` экспортит оба (learn импортит напрямую из web-shell — brief 4). tsconfig.base паттерны координирует architect.

## Дом (подтверждение)
Nav/Launcher — app-level connected-блоки → shell (не boost: тут нет тяжёлой композиции dnd/resize, только визуал+emit+router). Палитра — отдельный кейс позже (возможно boost).

## Verify
`nx run @capsuletech/web-shell:test --skip-nx-cache` + `:typecheck`. **Ноль сырых классов** (визуал весь в web-ui). НЕ трогать Picker/Header/ThemePicker.
