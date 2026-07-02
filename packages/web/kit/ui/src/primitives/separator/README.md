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
| `decorative` | `boolean` | `true` | Декоративный vs семантический разделитель. ⚠️ Известный gap: Kobalte 0.13 опцию не поддерживает — флаг сейчас не влияет на a11y-роль |
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

Рендерится `<hr>` — нативная имплицитная роль `separator`. `orientation="vertical"` добавляет `aria-orientation="vertical"`. Для вертикального варианта нужен родитель с высотой (линия — `h-full`).

## Контракт для studio {#contract}

<!-- audience: agent -->
`separator.contract.ts` — leaf; контракт-props: `variant` / `orientation` / `decorative`. Тесты контракта — `__tests__/separator.test.tsx` (orientation pass-through закреплён; `decorative` не закреплён — известный gap, см. заметку в тест-файле).
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/group|Group]] — `Group.Separator` для attached-групп.
- [[web-ui/primitives/field|Field]] — `Field.Separator` с текстом по центру.
