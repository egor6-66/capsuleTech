/**
 * VersionInfo — VersionInfoDto бэкенда: краткая запись версии любой сущности
 * (Config / Branch / App / AppSchema). Ответ versions-эндпойнтов.
 * Поля optional — OpenAPI не помечает их required.
 */
const VersionInfo = Entity(() => ({
  schema: Zod.object({
    versionId: Zod.string().uuid().optional(),
    version: Zod.number().int().optional(),
    createdAt: Zod.string().optional(),
  }),
}));

export default VersionInfo;
