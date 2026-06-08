/**
 * Config — ConfigDto бэкенда: версионируемый конфиг внутри ветки-контейнера.
 * `model` — произвольная JSON-модель данных конфига. Поля optional —
 * OpenAPI не помечает их required для response-DTO.
 *
 * ConfigInfoDto (ответ списка) = эта схема без `model` — выводится в
 * эндпойнте через `.omit({ model: true })`, отдельная entity не нужна.
 */
const Config = Entity(({ zod }) => ({
  schema: zod.object({
    id: zod.string().uuid().optional(),
    versionId: zod.string().uuid().optional(),
    version: zod.number().int().optional(),
    name: zod.string().optional(),
    displayName: zod.string().optional(),
    branchId: zod.string().uuid().optional(),
    branchVersionId: zod.string().uuid().optional(),
    createdAt: zod.string().optional(),
    model: zod.record(zod.unknown()).optional(),
  }),
}));

export default Config;
