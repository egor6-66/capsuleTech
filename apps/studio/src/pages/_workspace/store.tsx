/**
 * /web-studio/store — leaf режима Store.
 *
 * Matrix app-shell со слотами студии: палитра компонентов · канвас · инспектор
 * (стили+пропсы) · инфо-панель контракта. Точка сборки нового компонента из примитивов.
 * `WebStudio.Canvas` берёт remote-контекст из `WebStudio.Provider` (шелл выше).
 */
const WebStudioStore = Page(() => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      sidebar: {
        children: <Widgets.Studio.ComponentsPalette />,
        swapGroup: 'widgets',
        initialSize: 0.25,
      },
      main: {
        children: <WebStudio.Canvas />,
        swapGroup: 'widgets',
      },
      rightBar: {
        children: <Widgets.Studio.Inspector />,
        swapGroup: 'widgets',
        initialSize: 0.25,
      },
      footer: {
        children: <Widgets.Studio.Info />,
        swapGroup: 'widgets',
        initialSize: 0.25,
      },
    }}
  />
));

export default WebStudioStore;
