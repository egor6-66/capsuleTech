
● Бриф для owner-studio: SelectField — съезжающий dropdown                                                                                                                      Симптом                                                                                                                                                                       В studio inspector SelectField дропдаун визуально «съезжает» влево относительно      
триггера (см. imgBugs/img.png). Тот же Select в                                        packages/web/domain/auth/src/ui/loginForm.tsx (поле в форме входа) работает          
корректно.                                                                           
Файлы

- packages/web/studio/src/inspector/fields/SelectField.tsx — место для фикса           - (контекст) packages/web/studio/src/inspector/fields/FieldShell.tsx — wrapper, через
  который рендерится Select

Корень                                                                                                                                                                      
Select-примитив (packages/web/kit/ui/src/primitives/input/select/variants.ts:90)     
пиннит ширину content-панели к ширине триггера через                                 
w-[var(--kb-popper-anchor-width)] — это корректное поведение Kobalte.

В SelectField триггер props.kit.Select рендерится без принудительной растяжки →      
Select.Trigger уменьшается до width: max-content («outline» + chevron). На узкий       триггер у правого края панели Props floating-ui накладывает collision-shift влево →    визуально «съезд».                                                                                                                                                          
В loginForm той же проблемы нет, потому что Select лежит в Ui.Field.Content внутри     Ui.Card w={96} — триггер тянется на ширину поля → анкор-ширина = ширина поля → панель   совпадает.                                                                                                                                                                 
Что починить                                                                                                                                                                  Заставить Select.Trigger в SelectField занимать всю ширину FieldShell (например,     
обернуть Select-вызов в Ui.Layout.Flex с w='full', либо добавить class="w-full" на   
сам Select-call если kit это пробрасывает, либо в FieldShell дать слоту контента     
w-full по умолчанию). Тогда --kb-popper-anchor-width = ширина поля, и панел
