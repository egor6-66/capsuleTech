/**
 * AppSchema — AppSchemaDto бэкенда: версионируемая схема приложения — контейнер
 * шаблонов. Под-структура шаблона (Template) живёт здесь же, локальной
 * под-схемой внутри фабрики.
 *
 * AppSchemaInfoDto (ответ списка) = эта схема без `templates` — `.omit(...)` в эндпойнте.
 */
const AppSchema = Entity(() => {
  // TemplateDto — шаблон внутри схемы; `bind` связывает его с TemplateSelection в App.
  const template = Zod.object({
    name: Zod.string().min(1),
    bind: Zod.string().optional(),
    description: Zod.string().optional(),
    templateIds: Zod.array(Zod.string().uuid()).optional(),
  });

  return {
    schema: Zod.object({
      id: Zod.string().uuid().optional(),
      versionId: Zod.string().uuid().optional(),
      version: Zod.number().int().optional(),
      name: Zod.string().optional(),
      displayName: Zod.string().optional(),
      createdAt: Zod.string().optional(),
      templates: Zod.array(template).optional(),
    }),
  };
});

export default AppSchema;
