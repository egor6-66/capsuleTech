# Brief — Ui.Accordion (studio-look пресет + nesting) + selectable-item (scope `ui`)

**Подготовка палитры к киту (канон [[feedback_product_wide_kit_layering]]).** Палитра (studio `ComponentsPalette`/`ComponentSegments`) = вложенный аккордеон + selectable-leaf + тултип-превью, но с **кучей сырых классов в пакете** и ручным конфигом. Референс вида = **studio-аккордеон** (его look — эталон). Задача: перенести этот вид в кит пресетом + убрать классы, чтобы палитра (в studio-волне) стала тонкой композицией. boost НЕ нужен. Палитру саму НЕ трогаем (studio отложен) — только кит.

## Референс (как палитра юзает аккордеон сейчас)
- L1: `<Accordion bordered defaultValue={['primitives']} fluid={250} multiple>` → Item(Trigger «Примитивы» + Content).
- Вложенный: `<Accordion multiple class="pl-3">` → per-компонент Item(icon+label) → Content → `<div class="flex flex-col pl-3">` → leaf-кнопки.
- Leaf: `<button class="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground" classList={{ 'bg-accent text-accent-foreground': selected }}>` + Tooltip-превью.

## Часть A — `Ui.Accordion`

1. **Studio-look пресет.** Завернуть эталонный вид в именованный пресет (`preset="segmented"` или через variants): `bordered` + плотность + вложенный индент — одной строкой, без ручного набора пропов. Снять точь-в-точь со studio-конфига (bordered + fluid + multiple + density). Токены замороженные (ADR 042), классы только внутри web-ui.
2. **Nesting-индент пропом** (убить сырой `pl-3`). Добавить проп на Accordion (`nested?: boolean` или `indent?`) → отступ вложенного уровня даёт компонент, НЕ потребитель классом. После — в палитре ноль `pl-3`.

Не ломать текущий публичный API (`bordered`/`rounded`/`fluid`/`multiple`/`collapsible` + Item/Trigger/Content) — только добавить пресет + nesting.

## Часть B — selectable-item (kit)

Leaf палитры = сырой `<button>` с классами. Нужен kit-примитив «выбираемая строка списка»:
```ts
export interface ISelectableItemProps {
  children: JSX.Element;          // label
  icon?: Component;               // опц. иконка слева
  selected?: boolean;             // подсветка (bg-accent)
  onSelect: () => void;
  trailing?: JSX.Element;         // опц. правый слот
  class?: string;
}
```
Поведение: клик → onSelect; `role`/tabIndex/Enter-Space; hover + selected подсветка. Визуал = миграция классов leaf-кнопки ВНУТРЬ примитива (там легитимны), пресет-driven. Тултип-превью НЕ сюда — остаётся композицией потребителя (web-ui Tooltip оборачивает SelectableItem).

**Дом:** на твоё усмотрение — вариант `Ui.List.Item` (selectable) ИЛИ отдельный `Ui.SelectableItem`. Рекомендую `List.Item` (leaf живёт в списке/аккордеоне). **Сообщи субпат** — architect добавит tsconfig-путь.

## Verify
`nx run @capsuletech/web-ui:build --skip-nx-cache` + `:test` + stories (Accordion `segmented`-пресет + nested; SelectableItem selected/hover/icon/trailing). Ноль сырых классов в публичном API. Реальная сборка палитры на этих примитивах — в studio-волне (не сейчас).
