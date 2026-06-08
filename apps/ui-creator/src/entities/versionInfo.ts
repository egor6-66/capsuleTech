/**
 * VersionInfo — VersionInfoDto бэкенда: краткая запись версии любой сущности
 * (Config / Branch / App / AppSchema). Ответ versions-эндпойнтов.
 * Поля optional — OpenAPI не помечает их required.
 */
const VersionInfo = Entity(({ zod }) => ({
  schema: zod.object({
    versionId: zod.string().uuid().optional(),
    version: zod.number().int().optional(),
    createdAt: zod.string().optional(),
  }),
}));

export default VersionInfo;
