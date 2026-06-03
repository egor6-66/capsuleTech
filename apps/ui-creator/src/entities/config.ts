/**
 * Config — ConfigDto бэкенда: версионируемый конфиг внутри ветки-контейнера.
 * `model` — произвольная JSON-модель данных конфига. Поля optional —
 * OpenAPI не помечает их required для response-DTO.
 *
 * ConfigInfoDto (ответ списка) = эта схема без `model` — выводится в
 * эндпойнте через `.omit({ model: true })`, отдельная entity не нужна.
 */
const Config = Entity((z) => ({
  schema: z.object({
    id: z.string().uuid().optional(),
    versionId: z.string().uuid().optional(),
    version: z.number().int().optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    branchId: z.string().uuid().optional(),
    branchVersionId: z.string().uuid().optional(),
    createdAt: z.string().optional(),
    model: z.record(z.unknown()).optional(),
  }),
}));

export default Config;
