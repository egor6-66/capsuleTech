/**
 * App — карточка задеплоенного приложения в каталоге хаба.
 *
 * Форма соответствует тому, что отдаёт `GET /api/apps` preview-сервера:
 *   app        — имя приложения (идентификатор)
 *   base       — base-path, под которым смонтировано приложение
 *   url        — URL для встраивания в iframe (может совпадать с base)
 *   deployedAt — ISO timestamp последнего деплоя, null если не известен
 */
const App = Entity((z) => ({
  schema: z.object({
    app: z.string(),
    base: z.string(),
    url: z.string(),
    deployedAt: z.string().nullable(),
  }),
}));

export default App;
