/**
 * Branch — BranchDto бэкенда: версионируемая ветка (VIEW или SCHEMA) с
 * родителями/детьми и координатами на канвасе. Все под-структуры ветки
 * (meta) живут здесь же, локальными под-схемами внутри фабрики.
 *
 * BranchInfoDto (ответ списка) = эта схема без parents/children/createdAt/model
 * — выводится в эндпойнте через `.omit(...)`.
 */
const Branch = Entity(({ zod }) => {
  // BranchMetaDto — координаты ветки на канвасе.
  const meta = zod.object({
    positionX: zod.number().optional(),
    positionY: zod.number().optional(),
  });

  return {
    schema: zod.object({
      id: zod.string().uuid().optional(),
      versionId: zod.string().uuid().optional(),
      version: zod.number().int().optional(),
      name: zod.string().optional(),
      displayName: zod.string().optional(),
      rootId: zod.string().uuid().optional(),
      category: zod.enum(['VIEW', 'SCHEMA']).optional(),
      parents: zod.array(zod.string().uuid()).optional(),
      children: zod.array(zod.string().uuid()).optional(),
      createdAt: zod.string().optional(),
      model: zod.record(zod.unknown()).optional(),
      meta: meta.optional(),
      isTemplate: zod.boolean().optional(),
      isRoot: zod.boolean().optional(),
    }),
  };
});

export default Branch;
