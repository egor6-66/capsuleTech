/**
 * AppFrame — основное рабочее пространство тестирования.
 *
 * Изолирует приложение в iframe: каждое приложение — независимая сборка
 * с собственным router + registry. Две капсулы в одном JS-контексте
 * конфликтуют; iframe-изоляция решает это.
 *
 * Корень — стабильный контейнер фиксированного размера с `bg-background`:
 * `Show` свапает fallback ↔ iframe внутри, не меняя внешний бокс, поэтому
 * смена выбранного приложения не вызывает layout-shift. Фон совпадает с темой,
 * так что кадр загрузки iframe не мигает белым.
 */
const AppFrame = View((Ui, props: { url?: string }) => (
  <div class="h-full w-full bg-background">
    <Ui.Flow.Show
      when={props?.url}
      fallback={
        <div class="h-full w-full flex items-center justify-center text-muted-foreground">
          Выбери приложение слева
        </div>
      }
    >
      <iframe
        src={props.url}
        title="app preview"
        class="block h-full w-full border-0 bg-background"
      />
    </Ui.Flow.Show>
  </div>
));

export default AppFrame;
