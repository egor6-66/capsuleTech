/**
 * /workspace/web-studio — layout-роут студии (тонкий, golden rule: Page = Layout + один Widget).
 * Персистентен при свопе дочерних workspace-роутов (design/logic/monitor) → держит subject.
 * Вся композиция — в `Widgets.Studio.Frame` (который держит <Outlet/> под дочерние роуты).
 *
 * Гейт: роль designer (developer видит всё).
 */

const WebStudioLayout = Page((Ui) => (
  <WebStudio.Provider>
    <Remote.Provider modules={[{ name: 'universal-canvas', url: 'http://localhost:3000' }]}>
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
    </Remote.Provider>
  </WebStudio.Provider>
));
export const meta = { can: 'studio' };

export default WebStudioLayout;
