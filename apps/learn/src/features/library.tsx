/**
 * Library — доменная фича библиотеки (канон app-фич: root `Features.App` = только
 * глобальные концерны, доменные события пакета ловит доменная фича аппа).
 *
 * Монтируется обёрткой в layout-странице `pages/_workspace/library/index.tsx` —
 * сток баблинга для `Learn.LibraryNav` и будущих library-событий.
 *
 * Под-навигация library (ADR 032): `Learn.LibraryNav` эмитит `onLibraryNavigate`
 * с payload = id под-раздела (`explorer` | `collections`) → роутим в `/library/<segment>`.
 */
const Library = Feature<Learn.LibraryNav.Events>(({ router }) => ({
  initial: 'idle',

  states: {
    idle: {},
  },

  onLibraryNavigate: ({ target }) => {
    router.goTo(`/library/${target.payload}`);
  },
}));

export default Library;
