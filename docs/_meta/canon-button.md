# Canon — Button (`@capsuletech/web-ui/button`)

> Phase-0 pilot of the web-ui canonization track (см. `MEMORY.md → playground-этал`).
> Button — первый компонент, на котором мы фиксируем canon-форму, поднимаем browser-test-bar и калибруем правила.
> После раскатки канона на 2–3 примитива (Button → Card → Input?) выделим общий мета-канон в `web-ui-canon.md`.

## Источники

Канон собран как «дифф референс-форм vs наш текущий код».

| Источник | Версия / коммит | Что берём | Файл |
|---|---|---|---|
| **shadcn/ui** (new-york v4) | `main` (2026-06-11) | variants-таблица, CVA-base, focus-ring, aria-invalid стиль, data-attrs hooks, icon-padding adapt | `apps/v4/registry/new-york-v4/ui/button.tsx` ([raw](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/button.tsx)) |
| **Kobalte** `@kobalte/core/button` | `main` (2026-06-11) | a11y-wiring (role / aria-disabled / tabIndex для non-native), Polymorphic-pattern, `data-disabled` | `packages/core/src/button/button-root.tsx` ([raw](https://raw.githubusercontent.com/kobaltedev/kobalte/main/packages/core/src/button/button-root.tsx)) |
| **CVA** | `class-variance-authority@^0.7` | variant-API форма | n/a |
| **Tailwind v4** | `tailwindcss@4` | `has-[>svg]`, `size-N`, `ring-X` синтаксис | n/a |

shadcn = форма variants + поверхностный CSS. Kobalte = a11y/polymorphic база (наш Slot её уже оборачивает в `web-style`). Наш слой = (а) дизайн-токены вместо raw `px-4 py-2`, (б) capsule-extensions (`loading`, `fullWidth`).

## Контракт

### Variants (1:1 shadcn)
`default` · `destructive` · `outline` · `secondary` · `ghost` · `link`

### Sizes (4 — узкий набор)
`default` · `sm` · `lg` · `icon`

shadcn v4 расширил до 8 (`xs`, `icon-xs`, `icon-sm`, `icon-lg`). Мы добавляем по нужде, не превентивно (см. `MEMORY.md → packages-adapt-to-architecture`).

### Polymorphic — `as`-prop через Kobalte Polymorphic

```tsx
<Button>Click</Button>                       // <button>
<Button as="a" href="/foo">Link</Button>     // <a href="/foo">
<Button as={Link} to="/page">Nav</Button>    // <Link to="/page">
```

Не `asChild` (Radix-pattern). Наш `as`-pattern даёт типизированный полиморфный generic `<T extends ValidComponent>`; Kobalte `<Polymorphic as=>` обеспечивает корректные a11y-атрибуты (role/aria-disabled/tabIndex/type) в зависимости от резолвлённого tagName.

**Через наш `Slot`** (`@capsuletech/web-ui/slot` → Kobalte Polymorphic-адаптер). Наследуем:
- `disabled` → нативный для `<button>/<input>`, `aria-disabled + role="button" + tabIndex={0}` для остальных;
- `data-disabled=""` при `disabled`;
- `type="button"` default (Kobalte mergeDefault) — не сабмитит формы случайно.

### Capsule-extensions

| Prop | Что | Обоснование |
|---|---|---|
| `loading?: boolean` | Заменяет children на `<Loader2 class="animate-spin" />` + ставит `disabled` + `aria-busy={true}` | Бизнес-кейс (форма-сабмит). Не в shadcn. **Обязан выставлять `aria-busy`** — иначе скринридер не знает про in-flight операцию. |
| `fullWidth?: boolean` | Добавляет `w-full` | API-shortcut, типобезопасно. Используется в `apps/playground` LoginForm. shadcn просит `class="w-full"`, наш короче. |

## CSS-канон

### Base (CVA-base — общая для всех вариантов)

```ts
cva(
  // layout
  'inline-flex items-center justify-center gap-2 whitespace-nowrap',
  // semantics
  'rounded-md text-sm font-medium cursor-pointer',
  // transition (узкий — only-colors, не transition-all)
  'transition-colors duration-200',
  // focus — двухслойный (shadcn canon)
  'outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  // disabled
  'disabled:pointer-events-none disabled:opacity-50',
  // aria-invalid (форма-валидация)
  'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
  // svg-children (адаптер для иконок)
  '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
)
```

### Отличия от shadcn (осознанные)

| Отличие | Причина |
|---|---|
| `transition-colors duration-200` вместо `transition-all` | Узкий transition производительнее на больших списках; numeric duration — наш канон (ADR 042). |
| `px-button` / `py-1.5` (токены) вместо `px-4 py-2` | Дизайн-токены (ADR 042). Темы переключают пэддинг через `--button-padding-*`. |
| `cursor-pointer` в base | UX-предпочтение (shadcn полагается на user-agent default). |

### Sizes — token padding + height

```ts
size: {
  default: 'h-9 px-button has-[>svg]:px-[calc(var(--button-padding)-0.25rem)]',
  sm: 'h-8 px-button-sm text-xs has-[>svg]:px-[calc(var(--button-padding-sm)-0.125rem)]',
  lg: 'h-10 px-button-lg has-[>svg]:px-[calc(var(--button-padding-lg)-0.5rem)]',
  icon: 'size-9 p-0',
}
```

`has-[>svg]:px-X` — сжимает горизонтальный padding когда внутри есть icon-child (shadcn-pattern; в Tailwind v4). Точные значения — owner-web-ui подбирает по дизайн-токенам.

## A11y baseline

| Случай | Атрибуты на DOM |
|---|---|
| Native `<button>` | `disabled` (native) |
| `<a>` или `as={Link}` | `disabled` НЕ применяется (links нельзя disable); cursor-default + `aria-disabled` |
| `as={CustomDiv}` (не button/input/a) | `role="button"` + `tabIndex={0}` + `aria-disabled` (Kobalte автоматически) |
| `loading=true` | `disabled` + `aria-busy="true"`, `<Loader2>` вместо children |
| `aria-invalid` (форма) | CSS показывает `border-destructive` + `ring-destructive/20` |

## Data-attributes (test/inspector/canvas-overlay hooks)

Каждый Button получает (рендерятся всегда, как у shadcn):

| Атрибут | Значение | Назначение |
|---|---|---|
| `data-slot="button"` | константа | Universal selector для browser-tests, web-creator inspector, потенциальный canvas-overlay outline. |
| `data-variant` | `'default' \| 'destructive' \| ...` | Тестовый matcher по варианту; Figma-sync (variant-prop = data-attr). |
| `data-size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | Same. |
| `data-disabled` | `""` или undefined | От Kobalte; через Slot прозрачно. |
| `data-busy` | `""` или undefined | Дублёр `aria-busy` для CSS-таргетинга (loading-стайлинг). |

## Drift vs текущий код (action list для owner-web-ui)

Файл: `packages/web/ui/src/primitives/button/`.

- [ ] **`variants.ts`** — заменить focus-ring на двухслойный (`focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`), добавить `aria-invalid:*` в base, добавить `has-[>svg]:*` в каждый size.
- [ ] **`button.tsx`** — навесить `data-slot="button"`, `data-variant`, `data-size` (рендерить всегда). При `loading=true` добавить `aria-busy="true"` + `data-busy=""`.
- [ ] **`interfaces.ts`** — без изменений (`fullWidth`, `loading` остаются).
- [ ] **`button.contract.ts`** — обновить `rule.props` zod-схему: добавить `aria-invalid`-кейс если применимо к contract; `rule.examples` — добавить `loading`, `fullWidth` примеры.
- [ ] **Тесты (`__tests__/button.test.tsx`)** — jsdom-уровень не трогаем (структурные проверки остаются); browser-тесты (Vitest browser-mode, Playwright provider) добавляются ОТДЕЛЬНО в `__browser__/button.browser.test.tsx` (см. план ниже).

## Browser-test чеклист (Vitest browser-mode, Playwright provider)

Запускается в реальном Chromium. Реализация — отдельный PR (см. `MEMORY.md → playground-этал` → «расщепить runner vs движок проверок»).

### Variant × Size матрица — token-conformance

```ts
for (const v of variants) for (const s of sizes) {
  render(<Button variant={v} size={s}>X</Button>);
  const el = page.getByRole('button');
  expect(el.dataset.variant).toBe(v);
  expect(el.dataset.size).toBe(s);
  const cs = getComputedStyle(el);
  // 1. height соответствует size token
  expect(cs.height).toBe(SIZE_HEIGHT[s]);
  // 2. background соответствует variant token
  expect(cs.backgroundColor).toBe(VARIANT_BG[v]);
  // 3. radius канон
  expect(cs.borderRadius).toBe(TOKEN.RADIUS_MD);
}
```

### Focus-ring (только в реальном браузере — jsdom не матчит `:focus-visible`)

```ts
render(<Button>X</Button>);
await page.keyboard.press('Tab');                          // фокус на кнопку
const cs = getComputedStyle(page.getByRole('button'));
expect(cs.boxShadow).toContain('3px');                     // двухслойный ring
expect(cs.borderColor).toBe(TOKEN.RING);
```

### Polymorphic

```ts
render(<Button as="a" href="/foo">X</Button>);
expect(page.locator('a[href="/foo"]')).toBeVisible();
expect(page.locator('a').getAttribute('role')).toBeNull();  // native link — без role
```

### Loading

```ts
render(<Button loading>Sign in</Button>);
const el = page.getByRole('button');
expect(el).toHaveAttribute('aria-busy', 'true');
expect(el).toBeDisabled();
expect(el.textContent).not.toContain('Sign in');
expect(el.querySelector('.animate-spin')).not.toBeNull();
```

### Keyboard (Space / Enter)

```ts
const onClick = vi.fn();
render(<Button onClick={onClick}>X</Button>);
await page.getByRole('button').focus();
await page.keyboard.press('Enter');
await page.keyboard.press(' ');
expect(onClick).toHaveBeenCalledTimes(2);
```

### Disabled + aria-invalid

```ts
render(<Button disabled>X</Button>);
expect(page.getByRole('button')).toBeDisabled();
await page.getByRole('button').click({ force: true });    // не должен срабатывать handler

render(<Button aria-invalid="true">X</Button>);
const cs = getComputedStyle(page.getByRole('button'));
expect(cs.borderColor).toBe(TOKEN.DESTRUCTIVE);
```

## Что в этой работе **не делаем** (явно отложено)

- Расширение sizes до 8 (xs / icon-xs / icon-sm / icon-lg). Прибавим по реальной нужде.
- Замена `as` на `asChild` (Radix-pattern). `as` — наш канон через Kobalte Polymorphic.
- Удаление `fullWidth`. Используется в `apps/playground` LoginForm — оставляем как convenience API.
- Извлечение rule-engine. Сначала Button + 1–2 других примитива на ad-hoc матчерах → потом выделяем повторяющееся в `@capsuletech/rules` (см. `MEMORY.md → playground-этал`).
- Сторибук теперь = `web-creator/catalog`. Старый Storybook продолжает жить, но НЕ берём его как референс — миграция Button-stories в catalog = отдельная задача после стабилизации канона.

## Ссылки

- `packages/web/ui/OWNERSHIP.md` — зона owner-web-ui (Button — `primitives/`).
- ADR 042 — design tokens canon (тут источник `--button-padding-*`).
- `docs/playground/contracts.md` — контракт-система (Button — первый контракт-эталон, `button.contract.ts`).
- `docs/playground/creator.md` — куда контракты «прикладываются» в редакторе.
