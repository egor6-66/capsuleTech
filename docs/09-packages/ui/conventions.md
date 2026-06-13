---
tags: [ui, conventions]
status: documented
last_updated: 2026-05-19
---

# UI-kit канон: primitives

Единый источник истины для людей и субагентов, которые добавляют новые компоненты в `@capsuletech/web-ui`. Эта страница — канон; локальный prompt субагента `ui-component` (в `.claude/agents/`, gitignored) должен совпадать с ней.

## Зачем единый канон

Каждый primitive должен выглядеть одинаково, типизироваться одинаково и использовать одну и ту же иерархию файлов. Без этого:
- Новые разработчики пишут варианты CVA по-разному (какой-то в `button.tsx`, какой-то в отдельном файле).
- IDE-autocomplete и tree-shaking работают непредсказуемо.
- Storybook-истории оказываются нетипизированными и не находятся.

**Принцип:** этот файл — единственный канон в репозитории. Промпт субагента `ui-component` (`.claude/agents/ui-component.md`) исключён из git — каждый разработчик хранит свою копию локально. Если меняешь канон — обнови этот файл, а локальный agent-prompt синхронизируй у себя руками.

## Файловая структура одного primitive

Папка `packages/web/ui/src/primitives/<name>/`:

```
button/
├── index.ts                 Barrel: экспорт Button и типов
├── interfaces.ts            IButtonProps, IButtonOwnProps, ButtonVariants
├── variants.ts              buttonCva (CVA-функция с Tailwind-классами)
├── button.tsx               Сам компонент (с splitProps, createStyle, Slot)
└── button.stories.tsx       Storybook story (обязателен)
```

Если primitive compound (как Card, Field, Layout):
```
card/
├── index.ts
├── interfaces.ts
├── variants.ts              (может быть)
├── card.tsx                 Card + Object.assign(Card, { Header, Title, ... })
├── parts.tsx                CardHeader, CardTitle, ... (отдельный файл)
└── card.stories.tsx
```

## Обязательные и опциональные файлы

| Файл | Обязателен? | Когда опционален |
|---|---|---|
| `index.ts` | Да | — |
| `interfaces.ts` | Да | — |
| `variants.ts` | Да | Только для layout-обёрток (Grid, Flex), где вся динамика идёт через inline `style`, не классы. |
| `<name>.tsx` | Да | — |
| `<name>.stories.tsx` | Да | Никогда. Primitive без story не считается готовым. |
| `parts.tsx` | Нет | Только если compound (Button не compound, Card.Header — compound). |

## Naming

- **Файлы:** `kebab-case` (`button.tsx`, `card.stories.tsx`).
- **Экспорты:** `PascalCase` (`Button`, `Card`, `CardHeader`).
- **Типы:** `I<Name>Props` / `I<Name>OwnProps` для интерфейсов, `<Name>Variants` для `VariantProps<typeof <name>Cva>`. CVA-функция — `<name>Cva` (lower-case, не интерфейс).

## Polymorphic `as` через Slot

Почему **не** `asChild` (Radix-style):
- `asChild` работает только если `children` — функция. Это усложняет type-signature и требует бойлерплейта для оборачивания.
- `@kobalte/core/polymorphic` (и наша `Slot`) полиморфны из коробки: `<Slot as="a" />`→ `<a />`, `<Slot as={CustomComponent} />` → `<CustomComponent />`, type-safe.

Стандартный паттерн:

```tsx
export const Button = <T extends ValidComponent = 'button'>(props: IButtonProps<T>) => {
  const [local, variants, others] = splitProps(props, ['class', 'style'], ['variant', 'size']);
  const { className, style } = createStyle(buttonCva, {
    ...variants,
    class: local.class,
    style: local.style,
  });
  const [polyProps, domProps] = splitProps(others, ['as']);
  
  return (
    <Slot
      as={(polyProps.as as T) ?? ('button' as T)}
      class={className()}
      style={style()}
      {...(domProps as object)}
    />
  );
};
```

## CVA через createStyle

Зачем `createMemo` внутри `createStyle`:

```ts
const { className, style } = createStyle(buttonCva, {
  ...variants,
  class: local.class,
  style: local.style,
});

// createStyle внутри делает:
// const className = createMemo(() => cn(cvaFn(props), props.class));
// const style = () => props.style;
```

Когда в props меняется `variant` (например, пользователь кликнул и контроллер поменял state → Entity перересовалась с новым variant'ом):
1. Без `createMemo`: Solid пересчитает весь JSX-tree компонента (подороже).
2. С `createMemo`: Solid пересчитает только `className()` и вставит новый класс в `class` атрибут (быстро).

`style` — это просто геттер, потому что CSS Properties — это объект, и Vue/React/Solid всё равно мержат дельту.

## Только темовые токены

Разрешённые Tailwind-токены в `variants.ts`:

```
Цвета:
  bg-background, bg-foreground
  bg-primary, text-primary-foreground
  bg-secondary, text-secondary-foreground
  bg-muted, text-muted-foreground
  bg-accent, text-accent-foreground
  bg-card, border-card
  bg-destructive, text-destructive-foreground
  border-border
  
+ прозрачность: /50, /80, /90 (перефразировка `var(--primary)/0.5` в Tailwind)

+ структурные: inline-flex, gap-4, rounded-md, h-10, px-4, transition-colors, ...
```

**Никаких** `bg-blue-500`, `text-white`, `text-gray-800`. Эти цвета не переключаются при смене темы и будут светить в неправильном контексте.

Если понадобилась нестандартная комбинация — добавь новый токен в `packages/web/style/src/themes/<name>.css` через CSS-переменную.

## Compound-компоненты

Пример: Card с Card.Header, Card.Title, Card.Content, Card.Footer.

**Паттерн** (рекомендованный — статика рядом с компонентом):
1. Создай parts в отдельном `parts.tsx`:
   ```tsx
   export const CardHeader = (props) => <div class="p-4 border-b" {...props} />;
   export const CardTitle = (props) => <Typography as="h3" {...props} />;
   // ...
   ```
2. В основном `card.tsx` сразу собери их в base через `Object.assign`:
   ```tsx
   import { CardContent, CardFooter, CardHeader, CardTitle } from './parts';

   const CardImpl = (props) => <div class="rounded-lg border bg-card" {...props} />;
   export const Card = Object.assign(CardImpl, {
     Header: CardHeader,
     Title: CardTitle,
     Content: CardContent,
     Footer: CardFooter,
   });
   ```
3. В `index.ts` — просто реэкспорт:
   ```tsx
   export { Card } from './card';
   export type * as ICard from './interfaces';
   ```

Пользователь пишет: `<Card><Card.Header>...</Card.Header></Card>`.

> [!warning] Gotcha: импорт compound только из barrel'я
> **Не** собирай compound в `index.ts` через дополнительный `Object.assign` после реэкспорта. Если статика добавляется *только* в barrel'е (`./index.ts`), импорт `from './card'` (а не `from '.'`) даст голый `CardImpl` без `.Header` / `.Title` — и `<Card.Header>` сломается с `Cannot read properties of undefined (reading 'name')`.
>
> Решение: всегда собирай статику в основном файле (как `Layout` в `layout.tsx` через `Object.assign(LayoutImpl, { slot })`) — тогда importable откуда угодно. Если по историческим причинам статика всё-таки в `index.ts` (как сейчас у Card / Field / Navigation), импортируй именно из barrel'я: `import { Card } from '.'`.

## Чек-лист: готов ли primitive

Когда добавляешь новый primitive:

1. **Структура файлов** — 5 обязательных файлов (или 6, если compound с `parts.tsx`).
2. **Экспорт в barrel** — добавлена строка в `packages/web/ui/src/primitives/index.ts`:
   ```ts
   export * from './<name>';
   ```
3. **Subpath exports в package.json** — две строки в `packages/web/ui/package.json`:
   ```json
   "./<name>": { "types": "...", "import": "...", "default": "..." },
   "./<name>/*": { ... }
   ```
4. **Story** — минимум Default + по одному варианту на каждый CVA-key (variant/size) + edge case (disabled/long-text/icon-only, где применимо).
5. **Проверка в Storybook** — `pnpm storybook` на http://localhost:6006, story отображается и работает.

Primitive **не готов**, если:
- Нет `.stories.tsx` (или story там, но пустая).
- Code содержит `as any` или `@ts-ignore` (мелкие `as object` для splitProps-бриджа допустимы).
- Классы hardcoded (не из CVA / createStyle), например `<button class="bg-blue-500" />`.
- Нет поддержки polymorphic `as` для элементов, которые могут менять тег (Button, Typography).

## Для агентов

> [!info]
> Если используешь субагент `ui-component` (`.claude/agents/ui-component.md`, gitignored) — синхронизируй его prompt с этой страницей у себя локально. Расхождение приводит к тому, что агент генерирует устаревший код. Реестр субагентов: [[agents]].
