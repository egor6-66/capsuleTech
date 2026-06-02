/**
 * Dashboard (`/workspace/dashboard`) — нод-канвас + палитра (ADR 027).
 *
 * `direction='horizontal'`: канвас слева (fill), палитра справа (узкая).
 * `Canvas` / `Palette` — top-level widgets; страница компонует их в
 * `Layout.Matrix`. Тащишь вид из палитры на канвас → нода материализуется.
 */

const Dashboard = Page((Ui) => (
  <Ui.Layout.Matrix
    preset="app-shell"
    slots={{
      main: {
        children: <Widgets.Canvas />,
        skeleton: <Ui.Skeleton variant="table" rows={100} />,
        draggable: true,

        swapGroup: 'widgets',
      },
      rightBar: {
        children: <Widgets.Palette />,
        skeleton: <Ui.Skeleton variant="card" />,
        draggable: true,
        swapGroup: 'widgets',
        initialSize: 0.1,
      },
    }}
  />
));
export default Dashboard;
