/**
 * /lessons — layout раздела (как library): под-навигация + Outlet.
 * Слот под `Learn.LessonsNav` (пакет добавит); пока только Outlet.
 */
const Lessons = Page((Ui) => (
  <Ui.Layout.Flex orientation="vertical" gapY={2} class="min-h-full flex-col p-2">
    {/* TODO: <Learn.LessonsNav /> — под-навигация раздела (пакет) */}
    <Ui.Outlet />
  </Ui.Layout.Flex>
));

export default Lessons;
