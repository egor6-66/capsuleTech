/**
 * Config API — `services.api.configs.*`. CRUD + версии конфигов.
 * Базовый URL — из capsule.app.ts (`/api/v1`). `:id`/`:versionId` в path
 * подставляются из одноимённых полей input, остальное → body (PUT/POST/PATCH)
 * или query (GET). Response-схемы тянутся из глобального `Entities.Config`.
 */

/** GET /configs — список (опц. фильтр по ветке). ConfigInfoDto = Config без model. */
export const list = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/configs',
  request: zod.object({ branchId: zod.string().uuid().optional() }),
  response: zod.array(Entities.Config.schema.omit({ model: true })),
}));

/** POST /configs — создать конфиг (ConfigCreateDto). */
export const create = defineEndpoint(({ zod }) => ({
  method: 'POST',
  path: '/configs',
  request: zod.object({
    name: zod.string().min(1),
    displayName: zod.string().min(1),
    branchId: zod.string().uuid(),
    branchVersionId: zod.string().uuid().optional(),
    model: zod.record(zod.unknown()).optional(),
  }),
  response: Entities.Config.schema,
}));

/** GET /configs/{id} — последняя версия. */
export const getById = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/configs/:id',
  request: zod.object({ id: zod.string().uuid() }),
  response: Entities.Config.schema,
}));

/** PUT /configs/{id} — новая версия (ConfigVersionUpdateDto). */
export const update = defineEndpoint(({ zod }) => ({
  method: 'PUT',
  path: '/configs/:id',
  request: zod.object({
    id: zod.string().uuid(),
    branchId: zod.string().uuid(),
    branchVersionId: zod.string().uuid().optional(),
    model: zod.record(zod.unknown()).optional(),
  }),
  response: Entities.Config.schema,
}));

/** PATCH /configs/{id} — метаданные (ConfigUpdateDto). */
export const updateMeta = defineEndpoint(({ zod }) => ({
  method: 'PATCH',
  path: '/configs/:id',
  request: zod.object({
    id: zod.string().uuid(),
    branchId: zod.string().uuid(),
    name: zod.string().optional(),
    displayName: zod.string().optional(),
  }),
  response: Entities.Config.schema,
}));

/** DELETE /configs/{id} — 204 No Content. */
export const remove = defineEndpoint(({ zod }) => ({
  method: 'DELETE',
  path: '/configs/:id',
  request: zod.object({ id: zod.string().uuid() }),
}));

/** GET /configs/{id}/versions — список версий. */
export const versions = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/configs/:id/versions',
  request: zod.object({ id: zod.string().uuid() }),
  response: zod.array(Entities.VersionInfo.schema),
}));

/** GET /configs/{id}/versions/{versionId} — версия по ID. */
export const versionById = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/configs/:id/versions/:versionId',
  request: zod.object({ id: zod.string().uuid(), versionId: zod.string().uuid() }),
  response: Entities.Config.schema,
}));

/** GET /configs/{id}/versions/number/{versionNumber} — версия по номеру. */
export const versionByNumber = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/configs/:id/versions/number/:versionNumber',
  request: zod.object({ id: zod.string().uuid(), versionNumber: zod.number().int() }),
  response: Entities.Config.schema,
}));

/** GET /configs/versions/search?branchId — все версии конфигов ветки-шаблона. */
export const searchVersionsByBranch = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/configs/versions/search',
  request: zod.object({ branchId: zod.string().uuid() }),
  response: zod.array(Entities.VersionInfo.schema),
}));
