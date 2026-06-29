const Store = Page((_Ui) => (
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

export default Store;
