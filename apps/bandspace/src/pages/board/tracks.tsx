/**
 * /board/tracks — раздел «Треки»: матрица виджетов (app-shell preset).
 *  - sidebar  — форма добавления трека (Views.SubmitForm)
 *  - main     — список на голосовании с ревью (Widgets.Predlojka)
 *  - rightBar — итоговый сет-лист (Widgets.Setlist)
 *
 * Слоты в одной swapGroup → их можно перетаскивать местами (ModeToggle «dnd»)
 * и ресайзить (ModeToggle «resize») из хедера.
 */
const Tracks = Page(() => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      sidebar: {
        children: <Views.SubmitForm />,
        swapGroup: 'tracks',
        initialSize: 0.28,
      },
      main: {
        children: <Widgets.Predlojka />,
        swapGroup: 'tracks',
      },
      rightBar: {
        children: <Widgets.Setlist />,
        swapGroup: 'tracks',
        initialSize: 0.3,
      },
    }}
  />
));

export default Tracks;
