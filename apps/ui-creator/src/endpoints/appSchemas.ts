/**
 * AppSchema API — `services.api.appSchemas.*`. CRUD + версии схем приложений.
 * См. configs.ts про path-params / base. Response — глобальный `Entities.AppSchema`.
 */

/** GET /app-schemas — список. AppSchemaInfoDto = AppSchema без templates. */
export const list = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/app-schemas',
  request: zod.object({}),
  response: zod.array(Entities.AppSchema.schema.omit({ templates: true })),
}));

/** POST /app-schemas — создать схему (AppSchemaCreateDto). */
export const create = defineEndpoint(({ zod }) => ({
  method: 'POST',
  path: '/app-schemas',
  request: zod.object({
    name: zod.string().min(1),
    displayName: zod.string().min(1),
    templates: zod
      .array(
        zod.object({
          name: zod.string().min(1),
          bind: zod.string().optional(),
          description: zod.string().optional(),
          templateIds: zod.array(zod.string().uuid()).optional(),
        }),
      )
      .optional(),
  }),
  response: Entities.AppSchema.schema,
}));

/** GET /app-schemas/{id} — последняя версия. */
export const getById = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/app-schemas/:id',
  request: zod.object({ id: zod.string().uuid() }),
  response: Entities.AppSchema.schema,
}));

/** PUT /app-schemas/{id} — новая версия (AppSchemaVersionUpdateDto). */
export const update = defineEndpoint(({ zod }) => ({
  method: 'PUT',
  path: '/app-schemas/:id',
  request: zod.object({
    id: zod.string().uuid(),
    templates: zod
      .array(
        zod.object({
          name: zod.string().min(1),
          bind: zod.string().optional(),
          description: zod.string().optional(),
          templateIds: zod.array(zod.string().uuid()).optional(),
        }),
      )
      .optional(),
  }),
  response: Entities.AppSchema.schema,
}));

/** PATCH /app-schemas/{id} — метаданные (AppSchemaUpdateDto). */
export const updateMeta = defineEndpoint(({ zod }) => ({
  method: 'PATCH',
  path: '/app-schemas/:id',
  request: zod.object({
    id: zod.string().uuid(),
    name: zod.string().optional(),
    displayName: zod.string().optional(),
    templates: zod
      .array(
        zod.object({
          name: zod.string().min(1),
          bind: zod.string().optional(),
          description: zod.string().optional(),
          templateIds: zod.array(zod.string().uuid()).optional(),
        }),
      )
      .optional(),
  }),
  response: Entities.AppSchema.schema,
}));

/** DELETE /app-schemas/{id} — 204 No Content. */
export const remove = defineEndpoint(({ zod }) => ({
  method: 'DELETE',
  path: '/app-schemas/:id',
  request: zod.object({ id: zod.string().uuid() }),
}));

/** GET /app-schemas/{id}/versions — список версий. */
export const versions = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/app-schemas/:id/versions',
  request: zod.object({ id: zod.string().uuid() }),
  response: zod.array(Entities.VersionInfo.schema),
}));

/** GET /app-schemas/{id}/versions/{versionId} — версия по ID. */
export const versionById = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/app-schemas/:id/versions/:versionId',
  request: zod.object({ id: zod.string().uuid(), versionId: zod.string().uuid() }),
  response: Entities.AppSchema.schema,
}));

/** GET /app-schemas/{id}/versions/number/{versionNumber} — версия по номеру. */
export const versionByNumber = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/app-schemas/:id/versions/number/:versionNumber',
  request: zod.object({ id: zod.string().uuid(), versionNumber: zod.number().int() }),
  response: Entities.AppSchema.schema,
}));
