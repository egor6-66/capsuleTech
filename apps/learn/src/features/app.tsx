/**
 * App — root feature learn-app'а.
 *
 * RouterPlugin монтирует `src/features/app.tsx` в `__root` выше `<Outlet/>` (mount-once)
 * → даёт логик-контекст всем страницам (Learn.Welcome эмитит `onNavigate` через useEmit).
 *
 * Без авторизации (пока): один стейт `idle`.
 *   onInit  — на голом `/` редиректим в `/workspace` (шелл-каркас).
 *   onNavigate (Learn.Welcome.Events) — переход в раздел `/workspace/<segment>`.
 */

const App = Feature<Learn.Welcome.Events & Learn.LibraryNav.Events>(({ router }) => ({
  initial: 'idle',

  states: {
    idle: {
      onInit: () => {
        // Голый корень → в workspace-шелл. Deep-link (/workspace/library) не трогаем.
        if (router.current() === '/') router.goTo('/workspace');
      },
    },
  },

  // Навигация из welcome-карточек: payload — id раздела (lessons/exercises/progress/library/guides).
  onNavigate: ({ target }) => {
    router.goTo(`/workspace/${target.payload}`);
  },

  // Под-навигация library (Learn.LibraryNav, ADR 032): payload — explorer|collections.
  onLibraryNavigate: ({ target }) => {
    router.goTo(`/workspace/library/${target.payload}`);
  },
}));

export default App;
