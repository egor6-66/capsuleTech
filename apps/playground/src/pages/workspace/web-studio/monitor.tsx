/**
 * /workspace/web-studio/monitor — Monitor workspace (тонкий дочерний роут, заглушка).
 */
const Monitor = Page(() => <Widgets.Studio.Monitor />);

export const meta = { can: 'studio' };

export default Monitor;
