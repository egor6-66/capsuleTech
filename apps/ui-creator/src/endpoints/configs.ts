/**
 * Config API — `services.api.configs.*`. CRUD + версии конфигов.
 * Базовый URL — из capsule.app.ts (`/api/v1`). `:id`/`:versionId` в path
 * подставляются из одноимённых полей input, остальное → body (PUT/POST/PATCH)
 * или query (GET). Response-схемы тянутся из глобального `Entities.Config`.
 */

/** GET /configs — список (опц. фильтр по ветке). ConfigInfoDto = Config без model. */
export const list = defineEndpoint((z) => ({
  method: 'GET',
  path: '/configs',
  request: z.object({ branchId: z.string().uuid().optional() }),
  response: z.array(Entities.Config.schema.omit({ model: true })),
}));

/** POST /configs — создать конфиг (ConfigCreateDto). */
export const create = defineEndpoint((z) => ({
  method: 'POST',
  path: '/configs',
  request: z.object({
    name: z.string().min(1),
    displayName: z.string().min(1),
    branchId: z.string().uuid(),
    branchVersionId: z.string().uuid().optional(),
    model: z.record(z.unknown()).optional(),
  }),
  response: Entities.Config.schema,
}));

/** GET /configs/{id} — последняя версия. */
export const getById = defineEndpoint((z) => ({
  method: 'GET',
  path: '/configs/:id',
  request: z.object({ id: z.string().uuid() }),
  response: Entities.Config.schema,
}));

/** PUT /configs/{id} — новая версия (ConfigVersionUpdateDto). */
export const update = defineEndpoint((z) => ({
  method: 'PUT',
  path: '/configs/:id',
  request: z.object({
    id: z.string().uuid(),
    branchId: z.string().uuid(),
    branchVersionId: z.string().uuid().optional(),
    model: z.record(z.unknown()).optional(),
  }),
  response: Entities.Config.schema,
}));

/** PATCH /configs/{id} — метаданные (ConfigUpdateDto). */
export const updateMeta = defineEndpoint((z) => ({
  method: 'PATCH',
  path: '/configs/:id',
  request: z.object({
    id: z.string().uuid(),
    branchId: z.string().uuid(),
    name: z.string().optional(),
    displayName: z.string().optional(),
  }),
  response: Entities.Config.schema,
}));

/** DELETE /configs/{id} — 204 No Content. */
export const remove = defineEndpoint((z) => ({
  method: 'DELETE',
  path: '/configs/:id',
  request: z.object({ id: z.string().uuid() }),
}));

/** GET /configs/{id}/versions — список версий. */
export const versions = defineEndpoint((z) => ({
  method: 'GET',
  path: '/configs/:id/versions',
  request: z.object({ id: z.string().uuid() }),
  response: z.array(Entities.VersionInfo.schema),
}));

/** GET /configs/{id}/versions/{versionId} — версия по ID. */
export const versionById = defineEndpoint((z) => ({
  method: 'GET',
  path: '/configs/:id/versions/:versionId',
  request: z.object({ id: z.string().uuid(), versionId: z.string().uuid() }),
  response: Entities.Config.schema,
}));

/** GET /configs/{id}/versions/number/{versionNumber} — версия по номеру. */
export const versionByNumber = defineEndpoint((z) => ({
  method: 'GET',
  path: '/configs/:id/versions/number/:versionNumber',
  request: z.object({ id: z.string().uuid(), versionNumber: z.number().int() }),
  response: Entities.Config.schema,
}));

/** GET /configs/versions/search?branchId — все версии конфигов ветки-шаблона. */
export const searchVersionsByBranch = defineEndpoint((z) => ({
  method: 'GET',
  path: '/configs/versions/search',
  request: z.object({ branchId: z.string().uuid() }),
  response: z.array(Entities.VersionInfo.schema),
}));
