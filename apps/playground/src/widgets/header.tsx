/**
 * Header — app-shell хедер workspace (композиция, без импортов; по образцу ewc).
 *
 * Слева — `Shapes.ShellNavigation` (рисуется через `Shell.Header.Navigation`).
 * Справа — `Shell.Header.Menu` (dropdown) с темой + logout.
 *
 * Logout: кнопка несёт tag 'logout' → UiProxy биндит клик → всплывает в корневую
 * `Features.App` (authed-стейт чистит вьювера → guest → /login). Тогглы темы
 * (`Shell.ModeToggle`/`Shell.ThemePicker`) — connected-блоки web-shell, читают
 * web-style сигналы сами.
 *
 * Всё — глобалы и `Ui`-примитивы из фабрики; ни одного `import` (эталонный app).
 */
const Header = Widget((Ui) => (
  <Shell.Header>
    <Shapes.ShellNavigation />
    <Shell.Header.Menu>
      <Shell.Header.Menu.Group>
        <Shell.Header.Menu.Label>Тема</Shell.Header.Menu.Label>
        <Ui.Layout.Flex class="px-2 py-1.5">
          <Shell.ModeToggle mode="dark" />
        </Ui.Layout.Flex>
        <Shell.ThemePicker mode="sub" />
      </Shell.Header.Menu.Group>
      <Shell.Header.Menu.Separator />
      <Shell.Header.Menu.Group>
        <Shell.Header.Menu.Label>Аккаунт</Shell.Header.Menu.Label>
        <Ui.Button variant="ghost" class="w-full justify-start" meta={{ tags: ['logout'] }}>
          Выйти
        </Ui.Button>
      </Shell.Header.Menu.Group>
    </Shell.Header.Menu>
  </Shell.Header>
));

export default Header;
