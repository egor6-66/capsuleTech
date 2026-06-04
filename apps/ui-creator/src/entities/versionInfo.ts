/**
 * VersionInfo — VersionInfoDto бэкенда: краткая запись версии любой сущности
 * (Config / Branch / App / AppSchema). Ответ versions-эндпойнтов.
 * Поля optional — OpenAPI не помечает их required.
 */
const VersionInfo = Entity((z) => ({
  schema: z.object({
    versionId: z.string().uuid().optional(),
    version: z.number().int().optional(),
    createdAt: z.string().optional(),
  }),
}));

export default VersionInfo;
