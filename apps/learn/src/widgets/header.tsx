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
    </Shell.Header.Menu>
  </Shell.Header>
));

export default Header;
