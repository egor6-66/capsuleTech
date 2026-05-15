const DndDemo = Page((Ui, Widgets) => (
  <Ui.Layout variant={'centroid'} slots={{ main: <Widgets.Demos.Dnd /> }} />
));

export default DndDemo;
