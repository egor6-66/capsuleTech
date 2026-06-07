/**
 * Branch — BranchDto бэкенда: версионируемая ветка (VIEW или SCHEMA) с
 * родителями/детьми и координатами на канвасе. Все под-структуры ветки
 * (meta) живут здесь же, локальными под-схемами внутри фабрики.
 *
 * BranchInfoDto (ответ списка) = эта схема без parents/children/createdAt/model
 * — выводится в эндпойнте через `.omit(...)`.
 */
const Branch = Entity(() => {
  // BranchMetaDto — координаты ветки на канвасе.
  const meta = Zod.object({
    positionX: Zod.number().optional(),
    positionY: Zod.number().optional(),
  });

  return {
    schema: Zod.object({
      id: Zod.string().uuid().optional(),
      versionId: Zod.string().uuid().optional(),
      version: Zod.number().int().optional(),
      name: Zod.string().optional(),
      displayName: Zod.string().optional(),
      rootId: Zod.string().uuid().optional(),
      category: Zod.enum(['VIEW', 'SCHEMA']).optional(),
      parents: Zod.array(Zod.string().uuid()).optional(),
      children: Zod.array(Zod.string().uuid()).optional(),
      createdAt: Zod.string().optional(),
      model: Zod.record(Zod.unknown()).optional(),
      meta: meta.optional(),
      isTemplate: Zod.boolean().optional(),
      isRoot: Zod.boolean().optional(),
    }),
  };
});

export default Branch;
