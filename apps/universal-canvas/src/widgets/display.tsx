/**
 * Демо-схема для рендерера (iter 1). Голый `Renderer.View` рисует UI из JSON +
 * registry компонентов — доказывает, что движок-по-пресету смонтирован в аппе.
 * Пока хардкод; реальная витрина пресетов и приём схемы по контракту — следующие
 * итерации. Типы нод — реальные kit-пути (registry = `{ ui: Ui }`).
 */

/**
 * Display — потребитель store родительского Controllers.Canvas.
 *
 * `store` приходит ВТОРЫМ аргументом Widget'а (враппер резолвит контекст один раз
 * на границе и отдаёт чистый store — см. IWidgetRenderer `(ui, store, props)`).
 * Никакого `useCtx()` в юзер-коде: это был бы повторный резолв того же контекста.
 *
 * Виджет НЕ знает, кто кормит данные — чистый потребитель store.
 *
 * Ниже харнеса — `<Renderer.View>`: голый рендерер по JSON-схеме (iter 1).
 */
const Display = Widget((Ui, store) => {
  // Схема для рендерера: присланная хостом (setComposition) → она, иначе demoSchema.
  // Реактивно — приход schema в context.data перерисует Renderer.View.
  const activeSchema = () => store?.ctx?.data?.schema;

  return (
    <Ui.Layout.Flex
      direction={'col'}
      h={'full'}
      w={'full'}
      gap={2}
      justify={'center'}
      align={'center'}
      class={'p-1'}
    >
      <Renderer.View schema={activeSchema()} registry={{ ui: Ui }} mode="static" />
    </Ui.Layout.Flex>
  );
});

export default Display;
