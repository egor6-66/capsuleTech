/**
 * Branch API — `services.api.branches.*`. CRUD + версии веток (VIEW / SCHEMA).
 * См. configs.ts про path-params / base. Response — глобальный `Entities.Branch`.
 */

/** GET /branches — список с фильтрами. BranchInfoDto = Branch без parents/children/createdAt/model. */
export const list = defineEndpoint((z) => ({
  method: 'GET',
  path: '/branches',
  request: z.object({
    isTemplate: z.boolean().optional(),
    isRoot: z.boolean().optional(),
    rootId: z.string().uuid().optional(),
    category: z.enum(['VIEW', 'SCHEMA']).optional(),
  }),
  response: z.array(
    Entities.Branch.schema.omit({
      parents: true,
      children: true,
      createdAt: true,
      model: true,
    }),
  ),
}));

/** POST /branches — создать ветку (BranchCreateDto). */
export const create = defineEndpoint((z) => ({
  method: 'POST',
  path: '/branches',
  request: z.object({
    name: z.string().min(1),
    displayName: z.string().min(1),
    rootId: z.string().uuid().optional(),
    positionX: z.number().optional(),
    positionY: z.number().optional(),
    parents: z.array(z.string().uuid()).optional(),
    model: z.record(z.unknown()).optional(),
    category: z.string().optional(),
    isTemplate: z.boolean().optional(),
  }),
  response: Entities.Branch.schema,
}));

/** GET /branches/{id} — последняя версия. */
export const getById = defineEndpoint((z) => ({
  method: 'GET',
  path: '/branches/:id',
  request: z.object({ id: z.string().uuid() }),
  response: Entities.Branch.schema,
}));

/** PUT /branches/{id} — новая версия (BranchVersionUpdateDto). */
export const update = defineEndpoint((z) => ({
  method: 'PUT',
  path: '/branches/:id',
  request: z.object({
    id: z.string().uuid(),
    parents: z.array(z.string().uuid()).optional(),
    model: z.record(z.unknown()).optional(),
  }),
  response: Entities.Branch.schema,
}));

/** PATCH /branches/{id} — метаданные (BranchUpdateDto). */
export const updateMeta = defineEndpoint((z) => ({
  method: 'PATCH',
  path: '/branches/:id',
  request: z.object({
    id: z.string().uuid(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    category: z.string().optional(),
    isSchemaBranch: z.boolean().optional(),
    meta: z.object({ positionX: z.number().optional(), positionY: z.number().optional() }).optional(),
    template: z.boolean().optional(),
  }),
  response: Entities.Branch.schema,
}));

/** DELETE /branches/{id} — 204 No Content. */
export const remove = defineEndpoint((z) => ({
  method: 'DELETE',
  path: '/branches/:id',
  request: z.object({ id: z.string().uuid() }),
}));

/** GET /branches/{id}/versions — список версий. */
export const versions = defineEndpoint((z) => ({
  method: 'GET',
  path: '/branches/:id/versions',
  request: z.object({ id: z.string().uuid() }),
  response: z.array(Entities.VersionInfo.schema),
}));

/** GET /branches/{id}/versions/{versionId} — версия по ID. */
export const versionById = defineEndpoint((z) => ({
  method: 'GET',
  path: '/branches/:id/versions/:versionId',
  request: z.object({ id: z.string().uuid(), versionId: z.string().uuid() }),
  response: Entities.Branch.schema,
}));

/** GET /branches/{id}/versions/number/{versionNumber} — версия по номеру. */
export const versionByNumber = defineEndpoint((z) => ({
  method: 'GET',
  path: '/branches/:id/versions/number/:versionNumber',
  request: z.object({ id: z.string().uuid(), versionNumber: z.number().int() }),
  response: Entities.Branch.schema,
}));
