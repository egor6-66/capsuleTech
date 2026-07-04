/**
 * /lessons — layout раздела уроков. Проще library: под-навигации (explorer/
 * collections) тут нет, раздел плоский — только `<Ui.Outlet/>` под `_index`.
 *
 * Обёрнут в `Features.Lessons` — сток баблинга доменных событий уроков
 * (`Learn.Lessons.List.onLessonSelect`, ADR 032). Стор уроков живёт внутри
 * `Learn.Lessons.*` блоков (пакет): клик в `List` открывает урок, `View` его
 * читает — фиче на v1 делать нечего (см. `features/lessons.tsx`).
 */
const LessonsLayout = Page((Ui) => (
  <Features.Lessons>
    <Ui.Layout.Flex h={'full'} w={'full'}>
      <Ui.Outlet />
    </Ui.Layout.Flex>
  </Features.Lessons>
));

export default LessonsLayout;
