const Main = Entity((Ui, Shapes) => (
  <Ui.Navigation>
    <Shapes.Header.NavItems />
    <Ui.Button meta={{ tags: ['logout'] }}>Logout</Ui.Button>
  </Ui.Navigation>
));

export default Main;
