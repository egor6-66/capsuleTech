# Brief — миграция аккордеон-справочников на kit (scope `learn`)

**⚠️ ПОРЯДОК:** сначала мержится `learn-accordion-1-ui.md` (subtitle-проп на
`Ui.Accordion.Trigger`). Этот бриф на него опирается.

**Контекст.** `Concepts.tsx` и `Rules.tsx` уже на `Ui.Accordion`, но leaf-элементы и
обёртки — сырой JSX с классами. Это последний raw-class хотспот learn/modules (грепом
проверено: остальное — легитимный `class={props.class}` pass-through). Довести оба блока
до эталона — ноль сырых классов, всё через kit-примитивы пропами.

## Файлы (правки идентичны в обоих — Concepts и Rules зеркальны)

`packages/web/workspace/learn/src/modules/lessons/Concepts.tsx`
`packages/web/workspace/learn/src/modules/lessons/Rules.tsx`

### 1. Триггер — subtitle пропом (убрать сырой `<span class="flex flex-col...">`)
Было (Concepts 99-106 / Rules 101-108):
```tsx
<Accordion.Trigger>
  <span class="flex min-w-0 flex-col gap-0.5 text-left">
    <Typography>{group.label}</Typography>
    <Typography size="sm" tone="muted">{group.subtitle}</Typography>
  </span>
</Accordion.Trigger>
```
Стало:
```tsx
<Accordion.Trigger subtitle={group.subtitle}>{group.label}</Accordion.Trigger>
```
После этого импорт `Typography` в файле, скорее всего, станет неиспользуемым — убрать.

### 2. Leaf — `Ui.List.Item` (убрать сырой `<button class="...hover:bg-accent">` + classList)
Было (Concepts 108-124 / Rules 110-126):
```tsx
<div class="flex flex-col gap-0.5 py-1 pl-3 pr-1">
  <For each={group.items}>
    {(concept) => (
      <button type="button" onClick={() => handleSelect(concept.id)}
        class="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 ...hover:bg-accent..."
        classList={{ 'bg-accent text-accent-foreground': props.id === concept.id }}>
        {concept.title}
      </button>
    )}
  </For>
</div>
```
Стало:
```tsx
<Layout.Flex direction="col" gap={0.5} py={1} px={1}>
  <For each={group.items}>
    {(concept) => (
      <List.Item
        selected={props.id === concept.id}
        onSelect={() => handleSelect(concept.id)}
      >
        {concept.title}
      </List.Item>
    )}
  </For>
</Layout.Flex>
```
(в `Rules.tsx` — `rule`/`props.id === rule.id`/`handleSelect(rule.id)`/`rule.title`.)

`List.Item` = selectable-leaf: сам держит hover/selected/focus-стили + `role="option"` +
Enter/Space (`selectableItemCva` внутри). Потребитель — только `selected`/`onSelect`/label.
Внутренний паддинг leaf у примитива свой; асимметрия `pl-3 pr-1` не воспроизводится
дословно (небольшой визуальный сдвиг допустим — это эталонизация, не пиксель-перфект).

### 3. Импорт
Добавить `import { List } from '@capsuletech/web-ui/list';` (субпат заведён в
tsconfig.base.json). `Accordion`/`Layout` уже импортированы.

## Логику НЕ трогать
`open/setOpen` controlled-раскрытие, `createEffect`-seed, `useEmitOptional`/`emit`,
`onMount`-загрузка, phantom `__events`, `Show`-fallback — всё как есть.

## Тесты
`__tests__/Concepts.test.tsx`, `__tests__/Rules.test.tsx` — если ассертят на `<button>`
или классы leaf, переписать на `role="option"` / текст элемента + проверку `selected`
(атрибут `aria-selected`/`data-selected` у `List.Item`). Клик по элементу по-прежнему
эмитит `onConceptSelect`/`onRuleSelect` — этот кейс сохранить.

## Verify
`nx run @capsuletech/web-learn:typecheck` + `nx run @capsuletech/web-learn:test` +
`nx run @capsuletech/web-learn:build`. Грепом убедиться: в `Concepts.tsx`/`Rules.tsx`
не осталось `class="..."`-литералов (только `class={props.class}` на руте — легитимно).
