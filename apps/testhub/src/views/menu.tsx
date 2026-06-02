/**
 * Menu — dropdown в правой части header'а хаба.
 *
 * Состав:
 *   - Layout — `Ui.LayoutModeToggle` (переключатель режима раскладки).
 *   - Theme  — `Ui.DarkModeToggle` (☀/☾) + `Ui.ThemePicker mode="sub"`
 *     (вложенное submenu со списком всех тем; ✓ на текущей).
 *
 * `mode="sub"` на ThemePicker рендерит `Dropdown.Sub` вместо собственного root —
 * встраивается в parent menu без конфликта focus / outside-click.
 * Toggle'ы НЕ оборачиваем в `Dropdown.Item`, иначе click закроет parent menu.
 */
const Menu = View((Ui) => (
  <Ui.Dropdown modal={false}>
    <Ui.Dropdown.Trigger as={Ui.Button} variant="ghost" size="icon" aria-label="Меню">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </Ui.Dropdown.Trigger>
    <Ui.Dropdown.Content>
      <Ui.Dropdown.Group>
        <Ui.Dropdown.Label>Layout</Ui.Dropdown.Label>
        <div class="px-2 py-1.5">
          <Ui.LayoutModeToggle />
        </div>
      </Ui.Dropdown.Group>
      <Ui.Dropdown.Separator />
      <Ui.Dropdown.Group>
        <Ui.Dropdown.Label>Theme</Ui.Dropdown.Label>
        <div class="px-2 py-1.5">
          <Ui.DarkModeToggle />
        </div>
        <Ui.ThemePicker mode="sub" />
      </Ui.Dropdown.Group>
    </Ui.Dropdown.Content>
  </Ui.Dropdown>
));

export default Menu;
