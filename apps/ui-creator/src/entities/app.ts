/**
 * App — AppDto бэкенда: версионируемое приложение, привязанное к схеме
 * (appSchema) с выбором конфигов под каждый шаблон. Под-структура выбора
 * (TemplateSelection) живёт здесь же, локальной под-схемой внутри фабрики.
 *
 * AppInfoDto (ответ списка) = эта схема без `selections` — `.omit(...)` в эндпойнте.
 */
const App = Entity(({ zod }) => {
  // TemplateConfigSelectionDto — выбор конфига (+ версии) для шаблона по `bind`.
  const selection = zod.object({
    bind: zod.string().min(1),
    configId: zod.string().uuid(),
    configVersionId: zod.string().uuid(),
  });

  return {
    schema: zod.object({
      id: zod.string().uuid().optional(),
      versionId: zod.string().uuid().optional(),
      version: zod.number().int().optional(),
      name: zod.string().optional(),
      displayName: zod.string().optional(),
      appSchemaId: zod.string().uuid().optional(),
      appSchemaVersionId: zod.string().uuid().optional(),
      createdAt: zod.string().optional(),
      selections: zod.array(selection).optional(),
    }),
  };
});

export default App;
