/**
 * Workspace widget — основной layout хаба (И1).
 *
 * Оборачивает `Features.Catalog` (загрузка каталога + select-логика).
 * Внутри — двухколонный split:
 *   слева  — `Views.AppList`  (фиксированный сайдбар, 260px)
 *   справа — `Views.AppFrame` (iframe выбранной аппы, flex-1)
 *
 * Клики на строках сайдбара несут теги `['select-app', 'app:<name>']`;
 * UiProxy пробрасывает их в `Features.Catalog.onClick`, который обновляет
 * `store.ctx.data.selected`. `Views.AppFrame` реактивно читает `selected`
 * через `useCtx()` и перерисовывает iframe.
 */
const Workspace = Widget((Ui) => (
  <Features.Catalog>
    <Ui.Layout.Flex class="h-screen w-full overflow-hidden">
      {/* Сайдбар — фиксированная ширина */}
      <div class="w-[260px] shrink-0">
        <Views.AppList />
      </div>

      {/* Разделитель */}
      <Ui.Separator orientation="vertical" />

      {/* Основная область — iframe */}
      <div class="min-w-0 flex-1">
        <Views.AppFrame />
      </div>
    </Ui.Layout.Flex>
  </Features.Catalog>
));

export default Workspace;
