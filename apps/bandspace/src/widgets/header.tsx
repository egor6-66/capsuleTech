/**
 * Header — app-shell хедер bandspace (композиция, без импортов; по образцу playground).
 *
 * Слева — `Shapes.ShellNavigation` (Треки / Календарь репетиций).
 * Справа — `Shell.Header.Menu`: оформление (тема) + переключатели режима матрицы
 * (resize/dnd → пользователь сам ресайзит/перетаскивает виджеты разделов).
 */
const Header = Widget(() => (
  <Shell.Header>
    <Shapes.ShellNavigation />

    <Shell.Header.Menu>
      <Shell.Appearance />

      <Shell.Header.Menu.Separator />
      <Shell.Header.Menu.Group>
        <Shell.Header.Menu.Label>Режим</Shell.Header.Menu.Label>
        <Shell.ModeToggle mode="resize" />
        <Shell.ModeToggle mode="dnd" />
      </Shell.Header.Menu.Group>
    </Shell.Header.Menu>
  </Shell.Header>
));

export default Header;
