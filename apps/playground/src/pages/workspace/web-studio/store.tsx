const Store = Page((Ui) => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      sidebar: {
        children: <Widgets.Studio.ComponentsPalette />,
        swapGroup: 'widgets',
        initialSize: 0.25,
      },
      main: {
        children: <Widgets.Studio.Canvas />,
        swapGroup: 'widgets',
      },
      rightBar: {
        children: <Widgets.Studio.ComponentsSettings />,
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
