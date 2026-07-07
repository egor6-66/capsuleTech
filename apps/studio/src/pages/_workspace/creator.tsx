/**
 * /web-studio/creator — leaf режима Creator.
 *
 * Matrix app-shell со слотами: дерево узлов · канвас · инспектор (стили+пропсы).
 * Procedural-сборка UI-дерева из preset'ов. `WebStudio.Canvas` берёт remote-контекст
 * из `WebStudio.Provider` (шелл выше). Раздел в разработке.
 */
const WebStudioCreator = Page(() => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      sidebar: {
        children: <Widgets.Studio.Tree />,
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
    }}
  />
));

export default WebStudioCreator;
