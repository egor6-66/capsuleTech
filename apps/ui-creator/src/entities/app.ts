/**
 * App — AppDto бэкенда: версионируемое приложение, привязанное к схеме
 * (appSchema) с выбором конфигов под каждый шаблон. Под-структура выбора
 * (TemplateSelection) живёт здесь же, локальной под-схемой внутри фабрики.
 *
 * AppInfoDto (ответ списка) = эта схема без `selections` — `.omit(...)` в эндпойнте.
 */
const App = Entity((z) => {
  // TemplateConfigSelectionDto — выбор конфига (+ версии) для шаблона по `bind`.
  const selection = z.object({
    bind: z.string().min(1),
    configId: z.string().uuid(),
    configVersionId: z.string().uuid(),
  });

  return {
    schema: z.object({
      id: z.string().uuid().optional(),
      versionId: z.string().uuid().optional(),
      version: z.number().int().optional(),
      name: z.string().optional(),
      displayName: z.string().optional(),
      appSchemaId: z.string().uuid().optional(),
      appSchemaVersionId: z.string().uuid().optional(),
      createdAt: z.string().optional(),
      selections: z.array(selection).optional(),
    }),
  };
});

export default App;
