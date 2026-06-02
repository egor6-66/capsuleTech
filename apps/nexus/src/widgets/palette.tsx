/**
 * Palette — top-level widget: панель доступных видов нод. Рендерит
 * `Shapes.Palette` (batch → `ui.List` из draggable-айтемов). Тащишь айтем на
 * `Widgets.Canvas` → нода материализуется. Кладётся в слот `Layout.Matrix`.
 */
const Palette = Widget(() => (
  <div class="h-full w-full overflow-auto p-2">
    <Shapes.Palette />
  </div>
));

export default Palette;
