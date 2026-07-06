# Brief — `Ui.Accordion.Trigger` subtitle-проп (scope `ui`)

**Контекст.** Learn-блоки `Concepts` и `Rules` (справочники аккордеоном) рисуют
заголовок группы одинаково: title + приглушённый подзаголовок. Сейчас это сырой
композит В ПОТРЕБИТЕЛЕ:
```tsx
<Accordion.Trigger>
  <span class="flex min-w-0 flex-col gap-0.5 text-left">
    <Typography>{group.label}</Typography>
    <Typography size="sm" tone="muted">{group.subtitle}</Typography>
  </span>
</Accordion.Trigger>
```
Два дефекта: (1) сырые классы в апп-слое (нарушает [[feedback_product_wide_kit_layering]]);
(2) `Trigger` оборачивает children в `<span>` (accordion.tsx:143) → блочная обёртка
внутри = невалидный nesting. Header группы «title + caption» — **повторяющийся паттерн**
(идентичен в Concepts и Rules, будет в любом справочнике-аккордеоне) → его место в ките
декларативным пропом, а не копипастой в каждом потребителе.

## Задача

Добавить `subtitle?: JSX.Element` в `Ui.Accordion.Trigger`. Когда передан — лейбл
рисуется колоночным стеком (title сверху, приглушённый subtitle снизу), стили
**внутри примитива** (там классы легитимны). Когда не передан — поведение ровно как
сейчас (`<span>{children}</span>`, одна строка). Публичный API не ломаем — только
добавляем опциональный проп.

### Файлы
- `packages/web/kit/ui/src/primitives/accordion/interfaces.ts` — `IAccordionTriggerProps`:
  добавить
  ```ts
  /** Опциональный приглушённый подзаголовок под лейблом. Когда задан, лейбл
   *  рисуется колоночным стеком (title + caption); иначе — одна строка. */
  subtitle?: JSX.Element;
  ```
- `packages/web/kit/ui/src/primitives/accordion/accordion.tsx` — `Trigger`:
  `splitProps` добавить `'subtitle'`; заменить `<span>{local.children}</span>` на
  ```tsx
  <Show
    when={local.subtitle}
    fallback={<span>{local.children}</span>}
  >
    <span class="flex min-w-0 flex-col gap-0.5 text-left">
      <span>{local.children}</span>
      <span class="text-xs font-normal text-muted-foreground">{local.subtitle}</span>
    </span>
  </Show>
  ```
  Chevron остаётся после (без изменений). `<span>`-обёртка (не `<div>`) — сохраняем
  валидность (span-in-span). Если предпочитаешь вынести класс стека в `variants.ts`
  константой (`accordionTriggerLabelStackClass`) — на твоё усмотрение, лишь бы 0 сырых
  классов утекало наружу.
- `accordion.stories.tsx` — добавить историю: `segmented`-аккордеон с триггерами,
  у которых задан `subtitle` (показать стек title+caption).
- `__tests__/accordion.test.tsx` — кейс: `subtitle` задан → рендерятся обе строки,
  подзаголовок в приглушённом тоне; `subtitle` не задан → одна строка (регресс-гард).

## Не делать
- SelectableItem уже есть (`list/selectableItem.tsx`) — не трогать.
- `nested`/`preset`/`density` — уже в примитиве, не трогать.

## Verify
`nx run @capsuletech/web-ui:build --skip-nx-cache` + `nx run @capsuletech/web-ui:test`.
Ноль сырых классов в публичном API. Существующие триггеры (без subtitle) не меняют вид.
