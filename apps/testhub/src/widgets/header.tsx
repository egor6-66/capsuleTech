/**
 * Header — верхняя панель хаба (слот `header` в Page-shell).
 *
 * Слева — титул платформы, справа — `Views.Menu` (dropdown смены темы/лайаута).
 * Stateless: данные каталога не нужны, только chrome + меню.
 */
const Header = Widget((Ui) => (
  <Ui.Layout.Flex align="center" justify="between" class="h-full px-4 border-b bg-background">
    <span class="font-semibold text-sm">Testing Hub</span>
    <Views.Menu />
  </Ui.Layout.Flex>
));

export default Header;
