import { Activity, Bot, FileText } from 'lucide-solid';

/**
 * Dashboard (`/workspace/dashboard`) — главный операционный экран Nexus.
 *
 * Matrix insert-mode v2 (ADR 022), `direction="horizontal"`:
 *   main     — рабочая зона СЛЕВА, по умолчанию ПУСТАЯ. `wrap` → виджеты
 *              раскладываются и переносятся; внутри main слоты DnD + resize.
 *   rightbar — узкий icon-rail СПРАВА (`height:'auto'` ≈ ширина иконок ~60px),
 *              `orientation:'vertical'` → узлы стопкой.
 *
 * Обе зоны `resizable:false` → фиксированы (нет хэндла между ними, не двигаются).
 * Узлы: `group:'node'`, обе зоны `accepts:['node']` → перенос rail↔main в обе
 * стороны. Каждый узел responsive: иконка в rail, полный виджет в main.
 * `layoutMode="edit"` — DnD/resize слотов внутри main всегда активны.
 */
const Dashboard = Page((Ui) => (
  <Ui.Layout.Matrix
    layoutMode="edit"
    dndMode="insert"
    direction="horizontal"
    rows={[
      {
        id: 'main',
        resizable: false,
        wrap: true,
        accepts: ['node'],
        cells: [],
      },
      {
        id: 'rightbar',
        height: 0.05,
        resizable: false,
        orientation: 'vertical',
        accepts: ['node'],
        cells: [
          {
            id: 'node-files',
            children: <Widgets.Nodes.FilePicker />,
            group: 'node',
            draggable: true,
          },
          {
            id: 'node-monitor',
            children: <Widgets.Nodes.Placeholder title="Мониторинг" icon={Activity} />,
            group: 'node',
            draggable: true,
          },
          {
            id: 'node-agent',
            children: <Widgets.Nodes.Placeholder title="Агент" icon={Bot} />,
            group: 'node',
            draggable: true,
          },
          {
            id: 'node-docs',
            children: <Widgets.Nodes.Placeholder title="Доки" icon={FileText} />,
            group: 'node',
            draggable: true,
          },
        ],
      },
    ]}
  />
));

export default Dashboard;
