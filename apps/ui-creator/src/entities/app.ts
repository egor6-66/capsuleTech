/**
 * App — AppDto бэкенда: версионируемое приложение, привязанное к схеме
 * (appSchema) с выбором конфигов под каждый шаблон. Под-структура выбора
 * (TemplateSelection) живёт здесь же, локальной под-схемой внутри фабрики.
 *
 * AppInfoDto (ответ списка) = эта схема без `selections` — `.omit(...)` в эндпойнте.
 */
const App = Entity(() => {
  // TemplateConfigSelectionDto — выбор конфига (+ версии) для шаблона по `bind`.
  const selection = Zod.object({
    bind: Zod.string().min(1),
    configId: Zod.string().uuid(),
    configVersionId: Zod.string().uuid(),
  });

  return {
    schema: Zod.object({
      id: Zod.string().uuid().optional(),
      versionId: Zod.string().uuid().optional(),
      version: Zod.number().int().optional(),
      name: Zod.string().optional(),
      displayName: Zod.string().optional(),
      appSchemaId: Zod.string().uuid().optional(),
      appSchemaVersionId: Zod.string().uuid().optional(),
      createdAt: Zod.string().optional(),
      selections: Zod.array(selection).optional(),
    }),
  };
});

export default App;
