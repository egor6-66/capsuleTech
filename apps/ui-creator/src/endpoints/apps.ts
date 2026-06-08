/**
 * App API — `services.api.apps.*`. CRUD + версии приложений.
 * См. configs.ts про path-params / base. Response — глобальный `Entities.App`.
 */

/** GET /apps — список (опц. фильтр по схеме). AppInfoDto = App без selections. */
export const list = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/apps',
  request: zod.object({ appSchemaId: zod.string().uuid().optional() }),
  response: zod.array(Entities.App.schema.omit({ selections: true })),
}));

/** POST /apps — создать приложение (AppCreateDto). */
export const create = defineEndpoint(({ zod }) => ({
  method: 'POST',
  path: '/apps',
  request: zod.object({
    name: zod.string().min(1),
    displayName: zod.string().min(1),
    appSchemaId: zod.string().uuid(),
    appSchemaVersionId: zod.string().uuid(),
    selections: zod
      .array(
        zod.object({
          bind: zod.string().min(1),
          configId: zod.string().uuid(),
          configVersionId: zod.string().uuid(),
        }),
      )
      .optional(),
  }),
  response: Entities.App.schema,
}));

/** GET /apps/{id} — последняя версия. */
export const getById = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/apps/:id',
  request: zod.object({ id: zod.string().uuid() }),
  response: Entities.App.schema,
}));

/** PUT /apps/{id} — новая версия (AppVersionUpdateDto). */
export const update = defineEndpoint(({ zod }) => ({
  method: 'PUT',
  path: '/apps/:id',
  request: zod.object({
    id: zod.string().uuid(),
    appSchemaId: zod.string().uuid().optional(),
    appSchemaVersionId: zod.string().uuid().optional(),
    selections: zod
      .array(
        zod.object({
          bind: zod.string().min(1),
          configId: zod.string().uuid(),
          configVersionId: zod.string().uuid(),
        }),
      )
      .optional(),
  }),
  response: Entities.App.schema,
}));

/** PATCH /apps/{id} — метаданные (AppUpdateDto). */
export const updateMeta = defineEndpoint(({ zod }) => ({
  method: 'PATCH',
  path: '/apps/:id',
  request: zod.object({
    id: zod.string().uuid(),
    appSchemaId: zod.string().uuid(),
    name: zod.string().optional(),
    displayName: zod.string().optional(),
  }),
  response: Entities.App.schema,
}));

/** DELETE /apps/{id} — 204 No Content. */
export const remove = defineEndpoint(({ zod }) => ({
  method: 'DELETE',
  path: '/apps/:id',
  request: zod.object({ id: zod.string().uuid() }),
}));

/** GET /apps/{id}/versions — список версий. */
export const versions = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/apps/:id/versions',
  request: zod.object({ id: zod.string().uuid() }),
  response: zod.array(Entities.VersionInfo.schema),
}));

/** GET /apps/{id}/versions/{versionId} — версия по ID. */
export const versionById = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/apps/:id/versions/:versionId',
  request: zod.object({ id: zod.string().uuid(), versionId: zod.string().uuid() }),
  response: Entities.App.schema,
}));

/** GET /apps/{id}/versions/number/{versionNumber} — версия по номеру. */
export const versionByNumber = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/apps/:id/versions/number/:versionNumber',
  request: zod.object({ id: zod.string().uuid(), versionNumber: zod.number().int() }),
  response: Entities.App.schema,
}));
