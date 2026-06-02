/**
 * Apps endpoints — каталог задеплоенных приложений.
 *
 * `services.api.apps.list()` → GET /api/apps
 *
 * В dev-сборке (`__CAPSULE_MOCKS__ = true`) preRequest короткозамыкает pipeline
 * мок-данными, не делая сетевого запроса. В prod-сборке (флаг = false) preRequest
 * = undefined → запрос идёт в реальный preview-сервер на `/api/apps`.
 */
export const list = defineEndpoint((z) => ({
  method: 'GET',
  path: '/apps',
  request: z.object({}),
  response: z.array(Entities.App.schema),
  preRequest: __CAPSULE_MOCKS__
    ? async ({ resolve }) => {
        resolve([
          {
            app: 'ewc',
            base: '/ewc/',
            url: '/ewc/',
            deployedAt: new Date().toISOString(),
          },
          {
            app: 'nexus',
            base: '/nexus/',
            url: '/nexus/',
            deployedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          },
          {
            app: 'demo',
            base: '/demo/',
            url: '/demo/',
            deployedAt: null,
          },
        ]);
      }
    : undefined,
}));
