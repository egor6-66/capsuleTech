---
title: Separator
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, separator]
last_updated: 2026-07-02
slug: web-ui/primitives/separator
---

# Separator {#separator}

Визуальный разделитель `@capsuletech/web-ui` поверх Kobalte `Separator` (рендерится `<hr>`). Горизонтальная линия `h-px` во всю ширину или вертикальная `w-px` во всю высоту, цвет — токен `bg-border`.

> Импорт: `import { Separator } from '@capsuletech/web-ui/separator';`

## Когда использовать {#usage}

- **Смысловая граница** между секциями меню, блоками карточки, группами тулбара.
- **Не использовать** внутри `Group` — там есть свой `Group.Separator` (учитывает attached-механику).
- Для разделителя с текстом по центру («или») в формах — `Field.Separator`.

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Ось: прокидывается в Kobalte (`data-orientation`, `aria-orientation` для vertical) |
| `variant` | `'horizontal' \| 'vertical'` | = `orientation` | Визуальный CVA-вариант; задавать отдельно нужно редко |
| `decorative` | `boolean` | `true` | `true` — чисто визуальный: `role="none"` убирает элемент из a11y-дерева; `false` — смысловой separator (имплицитная роль `<hr>`) |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Прокидываются на элемент |

```tsx
<Separator />                             {/* горизонтальная линия */}
<Flex direction="row" h={6} gap={2}>
  <span>A</span>
  <Separator orientation="vertical" />
  <span>B</span>
</Flex>
```

## Доступность {#a11y}

Рендерится `<hr>`. Канон Radix/shadcn: по умолчанию (`decorative`) разделитель чисто визуальный — явная `role="none"` убирает его из a11y-дерева; `decorative={false}` сохраняет имплицитную роль `separator`, для vertical добавляется `aria-orientation="vertical"`. Ставь `decorative={false}` только когда разделитель несёт смысл структуры (границы секций документа), не для косметики. Для вертикального варианта нужен родитель с высотой (линия — `h-full`).

## Контракт для studio {#contract}

<!-- audience: agent -->
`separator.contract.ts` — leaf; контракт-props: `variant` / `orientation` / `decorative`. Тесты контракта — `__tests__/separator.test.tsx` (orientation pass-through + decorative-семантика закреплены). `decorative` реализован в нашей обёртке (Kobalte 0.13 опции не имеет, в DOM проп не форвардится).
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/group|Group]] — `Group.Separator` для attached-групп.
- [[web-ui/primitives/field|Field]] — `Field.Separator` с текстом по центру.
