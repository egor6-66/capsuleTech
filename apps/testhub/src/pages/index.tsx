/**
 * Workspace — корневая страница testing-hub (маршрут `/`).
 *
 * Page-shell на `Ui.Layout.Matrix preset="app-shell"`:
 *   header  — `Widgets.Header`  (титул + меню смены темы/лайаута)
 *   sidebar — `Widgets.Sidebar` (каталог развёрнутых приложений)
 *   main    — `Widgets.Frame`   (iframe выбранного приложения)
 *
 * Слоты resizable (дефолт Matrix) — пользователь может перетягивать границы.
 *
 * `Features.Catalog` оборачивает всю Matrix — единственный источник правды
 * (`list` / `selected`). Виджеты-слоты читают его store вторым аргументом.
 */
const Workspace = Page((Ui) => (
  <Features.Catalog>
    <Ui.Layout.Matrix
      preset="app-shell"
      slots={{
        header: { children: <Widgets.Header />, resizable: true, initialSize: 0.04 },
        sidebar: { children: <Widgets.Sidebar />, initialSize: 0.1 },
        main: { children: <Widgets.Frame /> },
      }}
    />
  </Features.Catalog>
));

export default Workspace;
