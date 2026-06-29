const Creator = Page((Ui) => (
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
        children: <Widgets.Studio.Tree />,
        swapGroup: 'widgets',
        initialSize: 0.25,
      },
      footer: {
        children: (
          <Ui.Layout.Flex wrap={'wrap'}>
            <Widgets.Studio.Inspector />
            <Widgets.Studio.Monitoring />
          </Ui.Layout.Flex>
        ),
        swapGroup: 'widgets',
        initialSize: 0.25,
      },
    }}
  />
));

export default Creator;
