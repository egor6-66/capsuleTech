/**
 * App API — `services.api.apps.*`. CRUD + версии приложений.
 * См. configs.ts про path-params / base. Response — глобальный `Entities.App`.
 */

/** GET /apps — список (опц. фильтр по схеме). AppInfoDto = App без selections. */
export const list = defineEndpoint((z) => ({
  method: 'GET',
  path: '/apps',
  request: z.object({ appSchemaId: z.string().uuid().optional() }),
  response: z.array(Entities.App.schema.omit({ selections: true })),
}));

/** POST /apps — создать приложение (AppCreateDto). */
export const create = defineEndpoint((z) => ({
  method: 'POST',
  path: '/apps',
  request: z.object({
    name: z.string().min(1),
    displayName: z.string().min(1),
    appSchemaId: z.string().uuid(),
    appSchemaVersionId: z.string().uuid(),
    selections: z
      .array(
        z.object({
          bind: z.string().min(1),
          configId: z.string().uuid(),
          configVersionId: z.string().uuid(),
        }),
      )
      .optional(),
  }),
  response: Entities.App.schema,
}));

/** GET /apps/{id} — последняя версия. */
export const getById = defineEndpoint((z) => ({
  method: 'GET',
  path: '/apps/:id',
  request: z.object({ id: z.string().uuid() }),
  response: Entities.App.schema,
}));

/** PUT /apps/{id} — новая версия (AppVersionUpdateDto). */
export const update = defineEndpoint((z) => ({
  method: 'PUT',
  path: '/apps/:id',
  request: z.object({
    id: z.string().uuid(),
    appSchemaId: z.string().uuid().optional(),
    appSchemaVersionId: z.string().uuid().optional(),
    selections: z
      .array(
        z.object({
          bind: z.string().min(1),
          configId: z.string().uuid(),
          configVersionId: z.string().uuid(),
        }),
      )
      .optional(),
  }),
  response: Entities.App.schema,
}));

/** PATCH /apps/{id} — метаданные (AppUpdateDto). */
export const updateMeta = defineEndpoint((z) => ({
  method: 'PATCH',
  path: '/apps/:id',
  request: z.object({
    id: z.string().uuid(),
    appSchemaId: z.string().uuid(),
    name: z.string().optional(),
    displayName: z.string().optional(),
  }),
  response: Entities.App.schema,
}));

/** DELETE /apps/{id} — 204 No Content. */
export const remove = defineEndpoint((z) => ({
  method: 'DELETE',
  path: '/apps/:id',
  request: z.object({ id: z.string().uuid() }),
}));

/** GET /apps/{id}/versions — список версий. */
export const versions = defineEndpoint((z) => ({
  method: 'GET',
  path: '/apps/:id/versions',
  request: z.object({ id: z.string().uuid() }),
  response: z.array(Entities.VersionInfo.schema),
}));

/** GET /apps/{id}/versions/{versionId} — версия по ID. */
export const versionById = defineEndpoint((z) => ({
  method: 'GET',
  path: '/apps/:id/versions/:versionId',
  request: z.object({ id: z.string().uuid(), versionId: z.string().uuid() }),
  response: Entities.App.schema,
}));

/** GET /apps/{id}/versions/number/{versionNumber} — версия по номеру. */
export const versionByNumber = defineEndpoint((z) => ({
  method: 'GET',
  path: '/apps/:id/versions/number/:versionNumber',
  request: z.object({ id: z.string().uuid(), versionNumber: z.number().int() }),
  response: Entities.App.schema,
}));
