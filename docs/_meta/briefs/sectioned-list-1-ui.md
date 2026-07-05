# Brief — `Ui.SectionedList` composite + manifest/store-регистрация (scope `ui`)

**⚠️ Landing вместе с `sectioned-list-2-web-core.md`** (инвариант-тест
`manifest-path-invariant` связывает manifest ↔ Ui-namespace — врозь CI красный).

## Канон (user, durable)
Любая **визуальная композиция** живёт СТРОГО в web-ui, пресетом — никогда в
пакете/аппе. Причина: **рендерер обязан уметь рисовать всё**, а studio-стор должен
содержать всё, что где-либо используется. Композиция вне кита = мимо стора/рендерера =
для фреймворка не существует. Пресетов может быть хоть 50 — все в ките.

«Аккордеон групп → выбираемый список» — повторяющийся паттерн (learn `Concepts`/`Rules`
+ studio `ComponentSegments`). Значит он = **один kit-composite**, потребители кормят
только данные.

## Часть A — composite `Ui.SectionedList`
Дом: `packages/web/kit/ui/src/composites/sectionedList/` (рядом с dataTable/menu).
Субпат `@capsuletech/web-ui/sectionedList` (сообщи точную строку — architect добавит
tsconfig-путь + optimizeDeps).

**Данные — plain/сериализуемые** (иначе в стор не лезет — preset должен быть JSON `ISchema`):
```ts
interface ISectionedListItem { id: string; label: JSX.Element; /* runtime: JSX; в сторе — string */ }
interface ISectionedListSection {
  value: string; label: JSX.Element; subtitle?: JSX.Element;
  icon?: Component<ComponentProps<'svg'>>; items: ISectionedListItem[];
}
interface ISectionedListProps {
  sections: ISectionedListSection[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;            // runtime-хендлер (в preset-схему НЕ входит)
  open?: string[]; onOpenChange?: (v: string[]) => void;   // controlled
  defaultOpen?: string[] | 'all';
  itemPreview?: (id: string) => JSX.Element;  // runtime-only (studio); КИТ сам оборачивает в Tooltip
  class?: string;
}
```
Внутри (вся структура — здесь, в ките):
- `<Accordion multiple>` **studio-look: без `bordered`, без `rounded`** (референс —
  studio `ComponentSegments`, там `<Accordion multiple class="pl-3">`; никаких боксов).
- на секцию: `Accordion.Item value={s.value}` → `Accordion.Trigger subtitle={s.subtitle}`
  (+ иконка слева, если `s.icon`) → `<List>` batch из `List.Item`
  (`selected={id===selectedId}`, `onSelect`, children=`item.label`).
- если задан `itemPreview` — кит оборачивает каждый `List.Item` в `<Tooltip>` с
  `Tooltip.Content = itemPreview(item.id)` (композиция Tooltip живёт в ките; потребитель
  даёт только контент = данные, не структуру).
- open: `open`/`onOpenChange` заданы → controlled; иначе внутренний сигнал, seed из
  `defaultOpen` (`'all'` = все секции). Ноль сырых классов наружу.

## Часть B — регистрация в сторе (manifest)
- `sectionedList.manifest.tsx`: `type: 'ui.SectionedList'`, category `'composite'`,
  icon, label «Секционный список», `propsSchema` (zod: sections/selectedId/open —
  label'ы как `string` для инспектора), `defaultProps` с сэмпл-секциями,
  `presets[]` — минимум 1 (`reference`, schema = `{ type:'ui.SectionedList',
  props:{ sections:[<сэмпл>] } }` для `<Renderer static>` превью).
- **Также зарегистрировать `ui.Accordion`** (сейчас его НЕТ в manifest — дыра): manifest
  на Accordion (container), presets (в т.ч. `subtitle`-стек). Compound-части
  (Item/Trigger/Content) — по образцу Card, если нужно рендерить bare-Accordion из схемы.
- Добавить обе записи в `manifest/registry.ts` `ALL[]`.

## Verify
`nx run @capsuletech/web-ui:build --skip-nx-cache` + `:test` + stories (SectionedList:
selected/open/subtitle/itemPreview; без бордеров). `getAllManifests()` содержит
`ui.SectionedList` + `ui.Accordion`. Инвариант-тест web-core прогонит owner-web-core
(парный бриф) — без Ui-namespace он ляжет, это ожидаемо до их правки.
