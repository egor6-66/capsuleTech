---
title: Field
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, field, form, composition]
last_updated: 2026-07-02
slug: web-ui/primitives/field
---

# Field {#field}

Form-field композиция `@capsuletech/web-ui`: корень `Field` (`role="group"`) + части `Field.Label` / `Field.Content` / `Field.Description` / `Field.Error` и обвязка форм (`Field.Group` / `Field.Set` / `Field.Legend` / `Field.Separator` / `Field.Title`). Раскладка управляется `orientation` — метка над вводом, слева или адаптивно.

> Импорт: `import { Field } from '@capsuletech/web-ui/field';`

## Когда использовать {#usage}

- **Любое поле формы**: метка + контрол + описание/ошибка как единый блок с согласованными отступами и disabled-каскадом.
- **Не использовать** для одиночной метки без структуры поля — для этого есть `Label`.
- Группы полей оборачивай в `Field.Group` / `Field.Set` — они задают вертикальный ритм формы.

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `orientation` | `'vertical' \| 'horizontal' \| 'responsive'` | `'vertical'` | vertical — метка над вводом; horizontal — метка слева; responsive — колонка, с `@md` контейнера — строка |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Прокидываются на корневой элемент |

Части принимают стандартные HTML-атрибуты своего тега + `class`.

## Композиция {#composition}

```tsx
<Field>
  <Field.Label for="email">Email</Field.Label>
  <Field.Content>
    <Input id="email" type="email" />
    <Field.Description>Рабочий адрес — на него придёт приглашение.</Field.Description>
  </Field.Content>
  <Field.Error errors={emailErrors()} />
</Field>
```

### Части {#parts}

| Часть | Тег | Назначение |
|---|---|---|
| `Field.Label` | `<label>` (через `Label`) | Метка; disabled-каскад через `group-data-[disabled]`; умеет оборачивать вложенный Field (card-style choice) |
| `Field.Content` | `<div>` | Стек контрола и описания (`flex-col gap-1.5`) |
| `Field.Description` | `<p>` | Приглушённый hint (`text-sm text-muted-foreground`) |
| `Field.Error` | `<div role="alert">` | Ошибки: `children` ИЛИ `errors: Array<{ message? }>` — одна строкой, несколько списком; без ошибок не рендерится |
| `Field.Group` | `<div>` | Контейнер формы (`@container/field-group`, `gap-2`) — контекст для `responsive` |
| `Field.Set` / `Field.Legend` | `<fieldset>` / `<legend>` | Семантическая группа связанных полей (radio/checkbox-группы) |
| `Field.Separator` | `<div>` | Горизонтальный разделитель с опциональным текстом по центру («или») |
| `Field.Title` | `<div>` | Не-label заголовок поля (когда `<label>` семантически неверен) |

## Ориентация {#orientation}

```tsx
<Field orientation="horizontal">…</Field>     {/* метка слева, чекбокс-строки */}
<Field.Group>
  <Field orientation="responsive">…</Field>   {/* колонка → строка от @md ширины Field.Group */}
</Field.Group>
```

`responsive` использует container-queries (`@md/field-group`) — работает только внутри `Field.Group`.

## Доступность {#a11y}

- Корень — `role="group"` (сознательно не `<fieldset>`: браузерная legend-раскладка не нужна; семантика по требованию — `Field.Set` + `Field.Legend`).
- `Field.Error` — `role="alert"`: появление ошибки анонсируется screen-reader'ом.
- Связь метки и контрола — стандартный `for`/`id` через `Field.Label`.
- Disabled-каскад: `data-disabled` на группе приглушает метку/заголовок автоматически.

## Tokens / стили {#tokens}

<!-- audience: agent,dev -->
- Ритм — `gap-2` корня, `gap-1.5` внутри Content; ошибки/описания — `text-sm`.
- Цвета — токены `text-muted-foreground` / `text-destructive` / `text-foreground`.
- Сложные состояния (checked-подсветка label-карточек, disabled-каскад) — data-атрибуты + `group-*`/`has-*` селекторы внутри частей; консьюмер классы руками не пишет.
<!-- /audience -->

## Контракт для studio {#contract}

<!-- audience: agent -->
`field.contract.ts` — kind `composition`: `rule.accepts` разрешает прямыми детьми `Field.Label` / `Field.Content` / `Field.Description` / `Field.Error`; контракт-prop корня — `orientation`. `styleSlots`: root/label/content/description/error. Обвязка (`Group`/`Set`/`Legend`/`Separator`/`Title`) — runtime-композиция, в палитра-контракт не входит. `class` — inspector-only, расширяется в `propsSchema` манифеста.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/label|Label]] — основа Field.Label.
- [[web-ui/primitives/input|Input]] — типовой контрол внутри Field.Content.
- [[web-ui/primitives/card|Card]] — контейнер формы из Field'ов.
