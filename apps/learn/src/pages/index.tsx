/**
 * / — home обучающего app'а.
 *
 * `Learn.Provider` (тонкий, ADR 055) оборачивает `Learn.Welcome` — landing с
 * карточками разделов. Welcome эмитит `onNavigate` → ловит root-Feature App.
 * В скелете Provider = passthrough; при наполнении он понесёт learn-контекст
 * (apiBase/модуль) и переедет в общий layout-роут.
 */
const Home = Page(() => (
  <Learn.Provider>
    <Learn.Welcome />
  </Learn.Provider>
));

export default Home;
