/**
 * Config — ConfigDto бэкенда: версионируемый конфиг внутри ветки-контейнера.
 * `model` — произвольная JSON-модель данных конфига. Поля optional —
 * OpenAPI не помечает их required для response-DTO.
 *
 * ConfigInfoDto (ответ списка) = эта схема без `model` — выводится в
 * эндпойнте через `.omit({ model: true })`, отдельная entity не нужна.
 */
const Config = Entity(() => ({
  schema: Zod.object({
    id: Zod.string().uuid().optional(),
    versionId: Zod.string().uuid().optional(),
    version: Zod.number().int().optional(),
    name: Zod.string().optional(),
    displayName: Zod.string().optional(),
    branchId: Zod.string().uuid().optional(),
    branchVersionId: Zod.string().uuid().optional(),
    createdAt: Zod.string().optional(),
    model: Zod.record(Zod.unknown()).optional(),
  }),
}));

export default Config;
