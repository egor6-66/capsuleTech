/**
 * Header — верхняя панель workspace: бренд + основная навигация.
 *
 * Тонкий Widget-хост для `Shapes.Navigation` (Shape напрямую в Page нарушил бы
 * «composition only in widgets»). Дальше тут появятся действия редактора.
 */
const Header = Widget((Ui) => (
  <Ui.Layout.Flex class="h-full items-center gap-4 px-4">
    <span class="font-semibold">UI Creator</span>
    <Shapes.Navigation />
  </Ui.Layout.Flex>
));

export default Header;
