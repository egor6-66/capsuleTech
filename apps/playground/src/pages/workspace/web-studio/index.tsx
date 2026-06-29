/**
 * /workspace/web-studio — layout-роут студии (тонкий, golden rule: Page = Layout + один Widget).
 * Персистентен при свопе дочерних workspace-роутов (design/logic/monitor) → держит subject.
 *
 * Гейт: роль designer (developer видит всё).
 *
 * Апп даёт студии лишь `canvasUrl` — вся remote-механика + связка палитра→канвас живут
 * ВНУТРИ студии (`WebStudio.Provider` монтит Remote.Provider + CanvasBinding). Апп не знает
 * про remote; наверху ловит только то, что студия осознанно эмитит (в этой итерации — ничего).
 */

const WebStudioLayout = Page((Ui) => (
  <WebStudio.Provider canvasUrl="http://localhost:3000">
    <Layouts.Matrix
      mode="view"
      preset="app-shell"
      slots={{
        header: {
          children: <Widgets.Studio.Header />,
          initialSize: 0.04,
        },
        main: {
          children: <Ui.Outlet />,
        },
      }}
    />
  </WebStudio.Provider>
));
export const meta = { can: 'studio' };

export default WebStudioLayout;
