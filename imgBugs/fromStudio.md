● Понял суть. Скорее всего фикс не сработал из-за того что Tailwind сканирует только kit (твоя память feedback_primitives_props_only_no_raw_classes.md)
— мой класс [&>*]:w-full я добавил в studio (FieldShell.tsx), а Tailwind его не компилит → класс есть в HTML, но CSS-правила для него не существует.
Это объясняет почему «по логике должно работать», а визуально без эффекта.                                                                                                                                                                                                                                 
Бриф для owner-web-ui:
  ---                                                                                                                                                  
SelectField dropdown shifts left in Studio Inspector                                                                                                                                                                                                                                                        
Симптом: см. imgBugs/img.png и imgBugs/bugSelect.md. В Studio Inspector dropdown панель SelectField'а визуально расширяется/съезжает ВЛЕВО за пределы   левого края триггера. Тот же Select в packages/web/domain/auth/src/ui/loginForm.tsx работает корректно — там Select сидит внутри Ui.Card w={96} с   
естественной растяжкой.                                                                                                                                                                                                                                                                                     
Главный уже трогал (2026-06-16, fail):                                                                                                                 - packages/web/studio/src/inspector/fields/FieldShell.tsx → <Field.Content class="[&>*]:w-full"> — не помогло.                                                                                                                                                                                                Гипотеза о причине провала: feedback_primitives_props_only_no_raw_classes.md — «Tailwind scans kit only». studio не в scan-path → [&>*]:w-full в     
JSX-маркапе studio не попадает в Tailwind content → CSS-правило не генерится. Сначала верифицировать в DevTools что класс действительно не скомпилен   (поискать \[\&\>\*\]\:w-full > \* в собранном CSS playground'a).

Файлы и теоретическая цепочка ширин (kit-компилимое vs нет):
- apps/playground/src/widgets/studio/componentsSettings.tsx — обёртка <Ui.Layout.Flex justify=center align=center h=full w=full> (props,             
  kit-compiled).
- packages/web/studio/src/controllers/WebStudioProps.tsx — <Flex orientation="vertical" gap={2} class="h-full w-full overflow-y-auto"> ← raw class в
  studio, не компилится.
- Inspector.tsx → <Accordion> → Accordion.Content → <Flex class="px-1 py-2"> ← raw class в studio.
- For-loop child = Field (kit flex w-full ... [&>*]:w-full от orientation=vertical) — kit-compiled ✓.
- Field.Content (kit flex flex-1 flex-col gap-1.5) — kit-compiled ✓.
- Kobalte Select.Root div (class="relative w-full" из kit/select.tsx) — kit-compiled ✓.
- Trigger button (INPUT_FIELD_BASE имеет flex w-full — kit-compiled ✓).
- Panel = w-[var(--kb-popper-anchor-width)] (kit/select/variants.ts:90) = trigger.clientWidth по rects.reference.width (popper-root.tsx:232).

Если trigger.clientWidth = real trigger width, panel = trigger width = same left/right. Раз не совпадает — либо [&>*]:w-full всё-таки нужен но в       kit'е, либо что-то выше зажимает Field на меньше чем visible "Props" ширина.                                                                         
Шаги:
1. Chrome MCP на user'овском dev-сервере playground (порт user уточнит) → studio store → Button-пресет → открыть variant select → в DevTools:        
   trigger.getBoundingClientRect().width, panel.getBoundingClientRect().width/left,                                                                     
   getComputedStyle(panel).getPropertyValue('--kb-popper-anchor-width'), getComputedStyle(field).width. Это закроет 80% вопроса за 30 секунд.
2. Проверить в собранном CSS bundle, генерится ли [&>*]:w-full (selector .\[\&\>\*\]\:w-full).                                                       
   Возможные фиксы (выбрать по находкам):
- A (если виноват scope Tailwind): добавить prop stretch или stretchChildren на Field.Content (kit), который форсит [&>*]:w-full (класс в kit →      
  компилится). FieldShell в studio выставляет prop. Канон сохранён — studio через props, не через raw classes.
- B: сделать [&>*]:w-full дефолтом FieldContent (createFieldPart в parts.tsx). Behavioral change — проверить stories Field/Toggle/прочие             
  inline-варианты, может сломать.                                                                                     
