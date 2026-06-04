/**
 * AppSchema API — `services.api.appSchemas.*`. CRUD + версии схем приложений.
 * См. configs.ts про path-params / base. Response — глобальный `Entities.AppSchema`.
 */

/** GET /app-schemas — список. AppSchemaInfoDto = AppSchema без templates. */
export const list = defineEndpoint((z) => ({
  method: 'GET',
  path: '/app-schemas',
  request: z.object({}),
  response: z.array(Entities.AppSchema.schema.omit({ templates: true })),
}));

/** POST /app-schemas — создать схему (AppSchemaCreateDto). */
export const create = defineEndpoint((z) => ({
  method: 'POST',
  path: '/app-schemas',
  request: z.object({
    name: z.string().min(1),
    displayName: z.string().min(1),
    templates: z
      .array(
        z.object({
          name: z.string().min(1),
          bind: z.string().optional(),
          description: z.string().optional(),
          templateIds: z.array(z.string().uuid()).optional(),
        }),
      )
      .optional(),
  }),
  response: Entities.AppSchema.schema,
}));

/** GET /app-schemas/{id} — последняя версия. */
export const getById = defineEndpoint((z) => ({
  method: 'GET',
  path: '/app-schemas/:id',
  request: z.object({ id: z.string().uuid() }),
  response: Entities.AppSchema.schema,
}));

/** PUT /app-schemas/{id} — новая версия (AppSchemaVersionUpdateDto). */
export const update = defineEndpoint((z) => ({
  method: 'PUT',
  path: '/app-schemas/:id',
  request: z.object({
    id: z.string().uuid(),
    templates: z
      .array(
        z.object({
          name: z.string().min(1),
          bind: z.string().optional(),
          description: z.string().optional(),
          templateIds: z.array(z.string().uuid()).optional(),
        }),
      )
      .optional(),
  }),
  response: Entities.AppSchema.schema,
}));

/** PATCH /app-schemas/{id} — метаданные (AppSchemaUpdateDto). */
export const updateMeta = defineEndpoint((z) => ({
  method: 'PATCH',
  path: '/app-schemas/:id',
  request: z.object({
    id: z.string().uuid(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    templates: z
      .array(
        z.object({
          name: z.string().min(1),
          bind: z.string().optional(),
          description: z.string().optional(),
          templateIds: z.array(z.string().uuid()).optional(),
        }),
      )
      .optional(),
  }),
  response: Entities.AppSchema.schema,
}));

/** DELETE /app-schemas/{id} — 204 No Content. */
export const remove = defineEndpoint((z) => ({
  method: 'DELETE',
  path: '/app-schemas/:id',
  request: z.object({ id: z.string().uuid() }),
}));

/** GET /app-schemas/{id}/versions — список версий. */
export const versions = defineEndpoint((z) => ({
  method: 'GET',
  path: '/app-schemas/:id/versions',
  request: z.object({ id: z.string().uuid() }),
  response: z.array(Entities.VersionInfo.schema),
}));

/** GET /app-schemas/{id}/versions/{versionId} — версия по ID. */
export const versionById = defineEndpoint((z) => ({
  method: 'GET',
  path: '/app-schemas/:id/versions/:versionId',
  request: z.object({ id: z.string().uuid(), versionId: z.string().uuid() }),
  response: Entities.AppSchema.schema,
}));

/** GET /app-schemas/{id}/versions/number/{versionNumber} — версия по номеру. */
export const versionByNumber = defineEndpoint((z) => ({
  method: 'GET',
  path: '/app-schemas/:id/versions/number/:versionNumber',
  request: z.object({ id: z.string().uuid(), versionNumber: z.number().int() }),
  response: Entities.AppSchema.schema,
}));
