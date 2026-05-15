const Home = Page((Ui, Widgets) => (
  <Ui.Layout
    variant={'standard'}
    animated="slide-up"
    slots={{
      header: <Widgets.Headers.Main />,
      main: <Ui.Outlet />,
      footer: <Widgets.Footers.Main />,
    }}
  />
));

export default Home;
