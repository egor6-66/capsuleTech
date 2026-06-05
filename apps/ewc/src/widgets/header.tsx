/**
 * Header — app-shell хедер workspace (композиция, без импортов).
 *
 * Слева — навигация (`Shapes.ShellNavigation` рисуется через `Shell.Header.Navigation`,
 * роутинг через `ui.Link` в Shape). Справа — `Shell.Header.Menu` (dropdown) с
 * mode-тогглами + темой + logout.
 *
 * Обёрнут в `Features.Workspace`: logout-кнопка несёт tag 'logout' → UiProxy биндит
 * клик → `Features.Workspace.onClick` (clear token + redirect /login). Тогглы
 * (`Shell.ModeToggle`/`Shell.ThemePicker`) — connected-блоки web-shell, читают
 * web-style сигналы сами.
 *
 * Всё — глобалы и `Ui`-примитивы из фабрики; ни одного `import` (эталонная апп).
 */
const Header = Widget((Ui) => (
  <Features.Workspace>
    <Shell.Header>
      <Shapes.ShellNavigation />
      <Shell.Header.Menu>
        <Shell.Header.Menu.Group>
          <Shell.Header.Menu.Label>Layout</Shell.Header.Menu.Label>
          <Ui.Layout.Flex orientation="vertical" gap={1} class="px-2 py-1.5">
            <Shell.ModeToggle mode="dnd" />
            <Shell.ModeToggle mode="resize" />
          </Ui.Layout.Flex>
        </Shell.Header.Menu.Group>
        <Shell.Header.Menu.Separator />
        <Shell.Header.Menu.Group>
          <Shell.Header.Menu.Label>Widget settings</Shell.Header.Menu.Label>
          <Ui.Layout.Flex class="px-2 py-1.5">
            <Shell.ModeToggle mode="settings" />
          </Ui.Layout.Flex>
        </Shell.Header.Menu.Group>
        <Shell.Header.Menu.Separator />
        <Shell.Header.Menu.Group>
          <Shell.Header.Menu.Label>Theme</Shell.Header.Menu.Label>
          <Ui.Layout.Flex class="px-2 py-1.5">
            <Shell.ModeToggle mode="dark" />
          </Ui.Layout.Flex>
          <Shell.ThemePicker mode="sub" />
        </Shell.Header.Menu.Group>
        <Shell.Header.Menu.Separator />
        <Shell.Header.Menu.Group>
          <Shell.Header.Menu.Label>Язык</Shell.Header.Menu.Label>
          <Shell.LocalePicker mode="sub" labels={{ ru: 'Русский', en: 'English' }} />
        </Shell.Header.Menu.Group>
        <Shell.Header.Menu.Separator />
        <Shell.Header.Menu.Group>
          <Shell.Header.Menu.Label>Account</Shell.Header.Menu.Label>
          <Ui.Button variant="ghost" class="w-full justify-start" meta={{ tags: ['logout'] }}>
            Logout
          </Ui.Button>
        </Shell.Header.Menu.Group>
      </Shell.Header.Menu>
    </Shell.Header>
  </Features.Workspace>
));

export default Header;
