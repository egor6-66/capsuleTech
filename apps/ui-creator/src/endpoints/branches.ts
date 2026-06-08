/**
 * Branch API — `services.api.branches.*`. CRUD + версии веток (VIEW / SCHEMA).
 * См. configs.ts про path-params / base. Response — глобальный `Entities.Branch`.
 */

/** GET /branches — список с фильтрами. BranchInfoDto = Branch без parents/children/createdAt/model. */
export const list = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/branches',
  request: zod.object({
    isTemplate: zod.boolean().optional(),
    isRoot: zod.boolean().optional(),
    rootId: zod.string().uuid().optional(),
    category: zod.enum(['VIEW', 'SCHEMA']).optional(),
  }),
  response: zod.array(
    Entities.Branch.schema.omit({
      parents: true,
      children: true,
      createdAt: true,
      model: true,
    }),
  ),
}));

/** POST /branches — создать ветку (BranchCreateDto). */
export const create = defineEndpoint(({ zod }) => ({
  method: 'POST',
  path: '/branches',
  request: zod.object({
    name: zod.string().min(1),
    displayName: zod.string().min(1),
    rootId: zod.string().uuid().optional(),
    positionX: zod.number().optional(),
    positionY: zod.number().optional(),
    parents: zod.array(zod.string().uuid()).optional(),
    model: zod.record(zod.unknown()).optional(),
    category: zod.string().optional(),
    isTemplate: zod.boolean().optional(),
  }),
  response: Entities.Branch.schema,
}));

/** GET /branches/{id} — последняя версия. */
export const getById = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/branches/:id',
  request: zod.object({ id: zod.string().uuid() }),
  response: Entities.Branch.schema,
}));

/** PUT /branches/{id} — новая версия (BranchVersionUpdateDto). */
export const update = defineEndpoint(({ zod }) => ({
  method: 'PUT',
  path: '/branches/:id',
  request: zod.object({
    id: zod.string().uuid(),
    parents: zod.array(zod.string().uuid()).optional(),
    model: zod.record(zod.unknown()).optional(),
  }),
  response: Entities.Branch.schema,
}));

/** PATCH /branches/{id} — метаданные (BranchUpdateDto). */
export const updateMeta = defineEndpoint(({ zod }) => ({
  method: 'PATCH',
  path: '/branches/:id',
  request: zod.object({
    id: zod.string().uuid(),
    name: zod.string().optional(),
    displayName: zod.string().optional(),
    category: zod.string().optional(),
    isSchemaBranch: zod.boolean().optional(),
    meta: zod
      .object({ positionX: zod.number().optional(), positionY: zod.number().optional() })
      .optional(),
    template: zod.boolean().optional(),
  }),
  response: Entities.Branch.schema,
}));

/** DELETE /branches/{id} — 204 No Content. */
export const remove = defineEndpoint(({ zod }) => ({
  method: 'DELETE',
  path: '/branches/:id',
  request: zod.object({ id: zod.string().uuid() }),
}));

/** GET /branches/{id}/versions — список версий. */
export const versions = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/branches/:id/versions',
  request: zod.object({ id: zod.string().uuid() }),
  response: zod.array(Entities.VersionInfo.schema),
}));

/** GET /branches/{id}/versions/{versionId} — версия по ID. */
export const versionById = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/branches/:id/versions/:versionId',
  request: zod.object({ id: zod.string().uuid(), versionId: zod.string().uuid() }),
  response: Entities.Branch.schema,
}));

/** GET /branches/{id}/versions/number/{versionNumber} — версия по номеру. */
export const versionByNumber = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/branches/:id/versions/number/:versionNumber',
  request: zod.object({ id: zod.string().uuid(), versionNumber: zod.number().int() }),
  response: Entities.Branch.schema,
}));
