/**
 * App — root feature learn-app'а.
 *
 * RouterPlugin монтирует `src/features/app.tsx` в `__root` выше `<Outlet/>` (mount-once)
 * → даёт логик-контекст всем страницам. Шелл — pathless-группа `pages/_workspace/`
 * (layout оборачивает все секции, URL'ы плоские: `/`, `/lessons`, `/library/explorer`).
 * `_public/` — для auth-роутов (login и т.п.), заведём с авторизацией.
 *
 * Без авторизации (пока). Роутинг по событиям навигации (ADR 032):
 *   onNavigate (Learn.Welcome) — раздел `/<segment>`.
 *   onLibraryNavigate (Learn.LibraryNav) — под-раздел `/library/<segment>`.
 */

const App = Feature<Learn.Welcome.Events & Learn.LibraryNav.Events>(({ router }) => ({
  initial: 'idle',

  states: { idle: {} },

  // Навигация из welcome-карточек: payload — id раздела (lessons/exercises/progress/library/guides).
  onNavigate: ({ target }) => {
    router.goTo(`/${target.payload}`);
  },

  // Под-навигация library (Learn.LibraryNav, ADR 032): payload — explorer|collections.
  onLibraryNavigate: ({ target }) => {
    router.goTo(`/library/${target.payload}`);
  },
}));

export default App;
