/**
 * /library/explorer — сетка слов (поиск + плитка). Инфо выбранного — в rightBar (layout).
 */
const Explorer = Page(() => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      main: {
        children: <Widgets.Words />,
        resizable: true,
      },
      rightBar: {
        children: <Widgets.WordInfo />,
        resizable: true,
      },
    }}
  />
));

export default Explorer;
