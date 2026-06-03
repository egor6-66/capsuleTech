/**
 * AppSchema — AppSchemaDto бэкенда: версионируемая схема приложения — контейнер
 * шаблонов. Под-структура шаблона (Template) живёт здесь же, локальной
 * под-схемой внутри фабрики.
 *
 * AppSchemaInfoDto (ответ списка) = эта схема без `templates` — `.omit(...)` в эндпойнте.
 */
const AppSchema = Entity((z) => {
  // TemplateDto — шаблон внутри схемы; `bind` связывает его с TemplateSelection в App.
  const template = z.object({
    name: z.string().min(1),
    bind: z.string().optional(),
    description: z.string().optional(),
    templateIds: z.array(z.string().uuid()).optional(),
  });

  return {
    schema: z.object({
      id: z.string().uuid().optional(),
      versionId: z.string().uuid().optional(),
      version: z.number().int().optional(),
      name: z.string().optional(),
      displayName: z.string().optional(),
      createdAt: z.string().optional(),
      templates: z.array(template).optional(),
    }),
  };
});

export default AppSchema;
