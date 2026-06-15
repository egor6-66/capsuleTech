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
        children: (
          <Ui.Layout.Flex h={'full'}>
            <Widgets.Studio.Contracts />
            <Widgets.Studio.Manifests />
          </Ui.Layout.Flex>
        ),
        swapGroup: 'widgets',
        initialSize: 0.25,
      },
    }}
  />
));

export default Store;
