/**
 * AppSchema — AppSchemaDto бэкенда: версионируемая схема приложения — контейнер
 * шаблонов. Под-структура шаблона (Template) живёт здесь же, локальной
 * под-схемой внутри фабрики.
 *
 * AppSchemaInfoDto (ответ списка) = эта схема без `templates` — `.omit(...)` в эндпойнте.
 */
const AppSchema = Entity(({ zod }) => {
  // TemplateDto — шаблон внутри схемы; `bind` связывает его с TemplateSelection в App.
  const template = zod.object({
    name: zod.string().min(1),
    bind: zod.string().optional(),
    description: zod.string().optional(),
    templateIds: zod.array(zod.string().uuid()).optional(),
  });

  return {
    schema: zod.object({
      id: zod.string().uuid().optional(),
      versionId: zod.string().uuid().optional(),
      version: zod.number().int().optional(),
      name: zod.string().optional(),
      displayName: zod.string().optional(),
      createdAt: zod.string().optional(),
      templates: zod.array(template).optional(),
    }),
  };
});

export default AppSchema;
