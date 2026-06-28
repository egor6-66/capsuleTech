/**
 * Header — app-shell хедер learn-workspace (зеркало playground, единый UI/UX-флоу).
 *
 * Слева — `Shapes.ShellNavigation` (через `Shell.Header.Navigation`).
 * Справа — `Shell.Header.Menu` с `Shell.Appearance` (тема/dark/finish, config-driven).
 *
 * Без account/logout (авторизации пока нет) и без ModeToggle (resize/dnd — studio-специфика,
 * в learn-контенте нет редактируемого канваса). Chrome тот же, что в playground.
 *
 * Всё — глобалы и `Ui`-примитивы; ни одного `import` (эталонный app).
 */
const Header = Widget(() => (
  <Shell.Header>
    <Shapes.ShellNavigation />
    <Shell.Header.Menu>
      <Shell.Appearance />

      <Shell.Header.Menu.Separator />
      <Shell.Header.Menu.Group>
        {/*<Ui.Layout.Flex orientation={'vertical'} gapY={2}>*/}
        <Shell.Header.Menu.Label>Режим</Shell.Header.Menu.Label>
        <Shell.ModeToggle mode="resize" />
        <Shell.ModeToggle mode="dnd" />
        {/*</Ui.Layout.Flex>*/}
      </Shell.Header.Menu.Group>

      <Shell.Header.Menu.Separator />
    </Shell.Header.Menu>
  </Shell.Header>
));

export default Header;
