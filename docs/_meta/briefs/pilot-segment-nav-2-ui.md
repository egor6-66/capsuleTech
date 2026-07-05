# Brief 2/4 — web-ui: SegmentedBar + Launcher (scope `ui`)

**Пилот дедупа Nav/Welcome (канон [[feedback_product_wide_kit_layering]]).** Два **stateless, пресет-driven** примитива — визуал, вынесенный из learn-копий. Роутер/emit НЕ знают (это слой connected — shell). **Классы только внутри web-ui**; потребитель — props/пресеты, ноль сырых классов.

## `SegmentedBar` — сегмент-бар (визуал из learn Nav)

Props-only:
```ts
export interface ISegmentedBarItem { id: string; label: string; }
export interface ISegmentedBarProps {
  items: readonly ISegmentedBarItem[];
  activeId?: string;              // подсветка; приходит извне (из web-router в shell)
  onSelect: (id: string) => void;
  preset?: string;               // именованная конфигурация вида (см. ниже)
  class?: string;
}
```
Визуал = миграция из `learn/library/Navigation.tsx`: `Group orientation=horizontal variant=attached` → `For items` → `Button variant={active?'default':'ghost'}` + `aria-current` + `pointer-events-none` на активном. Всё это — ВНУТРИ компонента (классы тут легитимны). Активный = `item.id === activeId`.

## `Launcher` — hero + грид карточек (визуал из learn Welcome)

Props-only:
```ts
export interface ILauncherItem { id: string; label: string; description?: string; }
export interface ILauncherProps {
  items: readonly ILauncherItem[];
  onSelect: (id: string) => void;
  title?: string; description?: string; hint?: string;
  preset?: string;
}
```
Визуал = миграция из `learn/welcome/Welcome.tsx`: центрированный `Layout.Flex` (hero: Typography h1 + muted) + грид кликабельных `Card` (role=button, tabIndex, onClick/onKeyDown Enter/Space → `onSelect(item.id)`, Card.Header{Title,Description}) + hint. Клик-хендлинг клавиатуры — тоже внутри.

## Пресеты (рычаг №1 канона)
Каждый компонент — дефолт-пресет + возможность именованных пресетов через `createStyle`/CVA (прецедент `button.presets.ts`). Пресет = композиция **замороженных** токенов (ADR 042), НЕ новые классы. Цель: «studio-look» vs «learn-look» = выбор пресета, не class-оверрайд. Для пилота достаточно дефолт-пресета + заложенной точки расширения (`preset?` prop резолвится в конфиг).

## Регистрация/экспорт
Subpath'ы `@capsuletech/web-ui/segmentedBar` + `/launcher` (paths в tsconfig.base.json координирует architect — **сообщи имена субпатов**), exports в package.json, Storybook stories (оба), unit-тест (рендер items, onSelect по клику, active-подсветка).

## Verify
`nx run @capsuletech/web-ui:build --skip-nx-cache` + `:test` + stories. **Ноль сырых классов в публичном API** (класс `class?` — passthrough, не обязателен).
