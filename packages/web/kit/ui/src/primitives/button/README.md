---
title: Button
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, button]
last_updated: 2026-06-16
---

# Button {#button}

Полиморфный кнопка-примитив `@capsuletech/web-ui`. По умолчанию рендерится как `<button>`, через `as` можно подставить любой тег или Solid-компонент. Состояния (`disabled`, `loading`), варианты (`variant`, `size`) и адаптер для иконок встроены в primitive — приложение не пишет classes руками.

> Импорт: `import { Button } from '@capsuletech/web-ui/button';`

## Когда использовать {#usage}

- **Действие**, инициируемое пользователем: submit формы, открытие диалога, переход по ссылке (через `as="a"`), запуск асинхронной операции.
- **Не использовать** для чисто визуальных индикаторов (badge/tag) — для этого есть отдельные примитивы.
- Кнопка-ссылка пишется через `as="a"` (или `as={Link}` из роутера), а не через `<a><Button/></a>` — иначе ломается доступность, focus-ring и `data-slot`.

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | `'default'` | Визуальный вариант (см. [[#variants]]) |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | Размер (`icon` = квадрат для одиночного svg) |
| `disabled` | `boolean` | `false` | Стандартный disabled (native attr + CSS-targeting через `data-disabled`) |
| `loading` | `boolean` | `false` | Заменяет children на `<Spinner/>` и блокирует кнопку (`aria-busy="true"` + `data-busy`) |
| `fullWidth` | `boolean` | `false` | Растягивает на ширину контейнера (`w-full`) |
| `as` | `ValidComponent` | `'button'` | Полиморфизм через `<Slot>` (Kobalte): `'a'`, `Link`, любой компонент |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Прокидываются в корневой элемент (CVA merges, не overrides) |

Все остальные пропсы передаются в выбранный через `as` элемент (HTML attrs для `'button'`/`'a'`, props компонента иначе). Полный typed-контракт — см. `button.contract.ts` (схема валидации для studio inspector).

## Варианты {#variants}

```tsx
<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link-style</Button>
```

- `default` — primary action на странице (один в группе).
- `secondary` — вторичное действие (cancel / back).
- `destructive` — необратимое действие (delete / discard); используется парно с подтверждением.
- `outline` — нейтральная кнопка без заливки (тулбары, toolbars).
- `ghost` — для iconButton'ов в плотных меню, hover-only фон.
- `link` — текстовая кнопка с underline-on-hover (inline в тексте).

## Размеры {#sizes}

```tsx
<Button size="sm">Small</Button>
<Button>Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Plus /></Button>
```

`size="icon"` — квадратная кнопка под одиночный svg (используется в toolbars / меню). Spacing для svg внутри обычной кнопки регулируется автоматически через `has-[>svg]:px-*` — не нужно подкручивать padding руками.

## Loading {#loading}

```tsx
<Button loading>Sign in</Button>
<Button loading={state.matches('submitting')}>Submit</Button>
```

`loading` оборачивает children в `<Show>`-fallback и рендерит `<Spinner/>`. Кнопка автоматически становится `disabled`, получает `aria-busy="true"` и `data-busy=""` для CSS-таргетинга. Подходит для оптимистичного UX в формах — кнопка остаётся в потоке, ширина может слегка меняться (если spinner шире текста).

## Полиморфизм (`as`) {#polymorphic}

```tsx
<Button as="a" href="/dashboard">Открыть дашборд</Button>
<Button as={Link} to="/users/$id" params={{ id }}>Профиль</Button>
```

`as` реализован через `<Slot>` (Kobalte). Stylings и `data-*` атрибуты переезжают на полученный элемент. Для `<button>` автоматически проставляется `type="button"` (защита от случайной submit-ы формы). Для прочих тегов `type` не ставится.

## Доступность {#a11y}

- Активный focus-ring (`focus-visible:ring-ring/50`) — двухслойный, как в shadcn (`border` + `ring`).
- `disabled` — native attr (не `aria-disabled`), плюс `data-disabled=""` для CSS.
- `loading` — `aria-busy="true"`. Screen-reader не озвучивает «загрузка», но braking-state считывается.
- `aria-invalid="true"` — кнопка получает destructive-ring (полезно в формах с server-side validation).
- Если содержимое кнопки — только иконка (`size="icon"`), всегда добавляй `aria-label`.

## Tokens / стили {#tokens}

<!-- audience: agent,dev -->
- Цвета — токены темы (`bg-primary`, `bg-secondary`, `bg-destructive`, …); не хардкодь hex / Tailwind-utility-цвета.
- Радиус — `rounded-md` (фиксирован в CVA, не вариант).
- Переход — `transition-colors duration-200` (нет `transition-all`, чтобы не было дёрганий при resize/loading).
- Padding — токены `--spacing-button*` (`px-button`, `px-button-sm`, `px-button-lg`).
<!-- /audience -->

## Slots / hooks (для тестов / inspector) {#slots}

<!-- audience: agent -->
| Атрибут | Назначение |
|---|---|
| `data-slot="button"` | Универсальный селектор для тестов и canvas-overlay |
| `data-variant` / `data-size` | Тест-матчеры + Figma-sync hooks |
| `data-disabled=""` / `data-busy=""` | CSS-targeting состояний (mirror native attrs) |
<!-- /audience -->

## Контракт для studio {#contract}

<!-- audience: agent -->
`button.contract.ts` описывает props в zod-схеме для studio inspector: enum'ы для `variant`/`size`, типы для booleans, `examples` (preview palette), `styleSlots: ['root']`. Если меняешь публичный API — обновляй сразу `interfaces.ts` + `button.contract.ts`, иначе inspector рассинхронизируется.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/slot|Slot]] — primitive под `as`-полиморфизмом (README → Phase 6).
- [[web-ui/primitives/spinner|Spinner]] — индикатор `loading`-стейта (README → Phase 6).
- [[_meta/canon-button|canon-button]] — обоснование решений (variant set, focus-ring, loading UX); живёт в root vault (`@capsuletech/web-docs`), резолвится у composer'а.
