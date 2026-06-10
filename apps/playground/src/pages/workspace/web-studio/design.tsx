/**
 * /workspace/web-studio/design — Design workspace (тонкий дочерний роут).
 * Рендерится в <Outlet/> каркаса; композиция — в `Widgets.Studio.Design`.
 */
const Design = Page(() => <Widgets.Studio.Design />);

export const meta = { can: 'studio' };

export default Design;
