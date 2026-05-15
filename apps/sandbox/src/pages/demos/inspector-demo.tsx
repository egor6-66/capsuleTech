const InspectorDemo = Page((Ui, Widgets) => (
  <Ui.Layout variant={'centroid'} slots={{ main: <Widgets.Demos.Inspector /> }} />
));

export default InspectorDemo;
