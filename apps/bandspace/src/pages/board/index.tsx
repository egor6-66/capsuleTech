/**
 * /board — каркас (shell) приложения. Persistent layout: хедер + <Outlet/> под
 * дочерние разделы (/board/tracks, /board/calendar).
 *
 * `mode="view"` локирует сам shell (его не ресайзят/таскают). Контентные матрицы
 * разделов — отдельные, они слушают глобальный ModeToggle из хедера.
 */
const Board = Page((Ui) => (
  <Layouts.Matrix
    mode="view"
    preset="app-shell"
    slots={{
      header: {
        children: <Widgets.Header />,
        resizable: false,
        initialSize: 0.06,
      },
      main: {
        children: <Ui.Outlet />,
        resizable: false,
      },
    }}
  />
));

export default Board;
