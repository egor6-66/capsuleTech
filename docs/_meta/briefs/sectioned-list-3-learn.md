# Brief — Concepts/Rules на `Ui.SectionedList` (scope `learn`)

**⚠️ ПОСЛЕ мержа `sectioned-list-1-ui.md`** (нужен composite + субпат
`@capsuletech/web-ui/sectionedList`). НЕ зависит от web-core-брифа (learn — пакет,
импортит субпат напрямую, не через `Ui`-глобал).

## Контекст
`Concepts.tsx` и `Rules.tsx` сейчас **сами композируют** `Accordion`+`For`+`Layout.Flex`+
`List.Item` (staged-правки прошлой итерации). Это нарушает канон «композиция — только в
ките». Ужать блоки до **данные + события**, вся структура — в `Ui.SectionedList`.

## Файлы
`packages/web/workspace/learn/src/modules/lessons/Concepts.tsx`
`packages/web/workspace/learn/src/modules/lessons/Rules.tsx`

## Что сделать
Заменить весь JSX-композит (Accordion/For/Flex/List.Item + сырые классы) на один
`<SectionedList>`, кормя данными:
```tsx
import { SectionedList } from '@capsuletech/web-ui/sectionedList';
// ...
<SectionedList
  sections={groups().map((g) => ({
    value: g.kind,            // (Rules: g.category)
    label: g.label,
    subtitle: g.subtitle,
    items: g.items.map((c) => ({ id: c.id, label: c.title })),
  }))}
  selectedId={props.id}
  onSelect={handleSelect}
  open={open()}
  onOpenChange={setOpen}
/>
```
- `handleSelect(id)` уже есть (эмитит `onConceptSelect`/`onRuleSelect`) — сигнатура
  совпала (`(id) => void`), просто передать по ref.
- `open`/`setOpen`/`createEffect`-seed/`useEmitOptional`/`onMount`-загрузка/phantom
  `__events`/`Show`-fallback — **как есть**, не трогать.
- Убрать неиспользуемые импорты (`Accordion`, `Layout`, `List`, возможно `For`).
  `Typography` — оставить, если ещё нужен в empty-fallback.
- **Ноль** сырых классов, ноль структурной композиции в файле.

## Тесты
`__tests__/Concepts.test.tsx`, `__tests__/Rules.test.tsx` — перевести ассерты на
`SectionedList` (текст элемента + клик → эмит `onConceptSelect`/`onRuleSelect`;
`selected` через `selectedId`). Клик-эмит-кейс сохранить.

## Verify
`nx run @capsuletech/web-learn:typecheck` + `:test` + `:build`. Грепом: в
`Concepts.tsx`/`Rules.tsx` нет `Accordion`/`<For`/`Layout.Flex`/`class="..."` — только
`SectionedList` + данные. Живой вид (без бордеров, studio-look) снимет user в браузере.
