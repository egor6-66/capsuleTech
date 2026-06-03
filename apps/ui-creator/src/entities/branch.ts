/**
 * Branch — BranchDto бэкенда: версионируемая ветка (VIEW или SCHEMA) с
 * родителями/детьми и координатами на канвасе. Все под-структуры ветки
 * (meta) живут здесь же, локальными под-схемами внутри фабрики.
 *
 * BranchInfoDto (ответ списка) = эта схема без parents/children/createdAt/model
 * — выводится в эндпойнте через `.omit(...)`.
 */
const Branch = Entity((z) => {
  // BranchMetaDto — координаты ветки на канвасе.
  const meta = z.object({
    positionX: z.number().optional(),
    positionY: z.number().optional(),
  });

  return {
    schema: z.object({
      id: z.string().uuid().optional(),
      versionId: z.string().uuid().optional(),
      version: z.number().int().optional(),
      name: z.string().optional(),
      displayName: z.string().optional(),
      rootId: z.string().uuid().optional(),
      category: z.enum(['VIEW', 'SCHEMA']).optional(),
      parents: z.array(z.string().uuid()).optional(),
      children: z.array(z.string().uuid()).optional(),
      createdAt: z.string().optional(),
      model: z.record(z.unknown()).optional(),
      meta: meta.optional(),
      isTemplate: z.boolean().optional(),
      isRoot: z.boolean().optional(),
    }),
  };
});

export default Branch;
