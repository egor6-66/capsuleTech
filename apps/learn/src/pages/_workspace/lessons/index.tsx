/**
 * /lessons — layout раздела уроков с под-навигацией (зеркало `library/index.tsx`).
 *
 * Обёрнут в `Features.Lessons` — сток баблинга доменных событий раздела:
 * `Learn.Nav.Lessons` (пакетный переключатель, ADR 032) эмитит `onSegmentNavigate`
 * `{ nav: 'lessons', segment }` → авто-баблится до `Features.App`, роут `/lessons/<segment>`.
 * Под-вью — в `<Ui.Outlet/>`; `_index` = дефолт
 * (концепты). Стор раздела живёт внутри `Learn.*` блоков (пакет).
 *
 * Уроки-маршруты (`Learn.Lessons`/`Learn.Lesson`) с раздела сняты до накопления контента
 * (блоки в пакете живут, регистрация остаётся — вернём вкладкой позже).
 */
const LessonsLayout = Page((Ui) => (
  <Features.Lessons>
    <Ui.Layout.Flex orientation={'vertical'} w={'full'} h={'full'}>
      <Widgets.Navigation>
        <Learn.Nav.Lessons />
      </Widgets.Navigation>
      <Ui.Separator />
      <Ui.Layout.Flex h={'full'} w={'full'}>
        <Ui.Outlet />
      </Ui.Layout.Flex>
    </Ui.Layout.Flex>
  </Features.Lessons>
));

export default LessonsLayout;
