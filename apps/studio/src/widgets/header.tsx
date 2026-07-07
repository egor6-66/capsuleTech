/**
 * Header — app-shell хедер workspace (композиция, без импортов; по образцу ewc).
 *
 * Слева — `Shapes.ShellNavigation` (рисуется через `Shell.Header.Navigation`).
 * Справа — `Shell.Header.Menu` (dropdown) с темой + logout.
 *
 * Logout: кнопка несёт tag 'logout' → UiProxy биндит клик → всплывает в корневую
 * `Features.App` (authed-стейт чистит вьювера → guest → /login).
 *
 * Стили — ОДИН блок `Shell.Appearance` (тема + dark + finish + finish-настройки +
 * фон, config-driven, по дефолту всё вкл). Апп не пересобирает контролы руками.
 *
 * Всё — глобалы и `Ui`-примитивы из фабрики; ни одного `import` (эталонный app).
 */
const Header = Widget((Ui) => (
  <Shell.Header>

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
