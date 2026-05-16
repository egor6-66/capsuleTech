const Welcome = Page((Ui, Widgets) => (
  <Ui.Layout variant={'centroid'} slots={{ main: <Widgets.Welcome /> }} />
));

export default Welcome;
