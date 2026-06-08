/**
 * Apps endpoints namespace.
 *
 * `services.api.apps.list()` — генерируется EndpointsRegistryPlugin'ом, бьёт в
 * `GET /api/apps` (base `/api` из capsule.app.ts). Сервер (preview-server)
 * отдаёт список развёрнутых не-корневых апп. Response — `Entities.App.schema[]`.
 *
 * Dev-мок через `__CAPSULE_MOCKS__` (build-time флаг): `resolve(data)`
 * короткозамыкает pipeline без сети, чтобы `capsule dev` показывал каталог без
 * запущенного сервера. В реальной сборке (без флага) `preRequest = undefined` →
 * endpoint идёт в сеть на `/api/apps`.
 */
const MOCK_LATENCY_MS = 150;

export const list = defineEndpoint(({ zod }) => ({
  method: 'GET',
  path: '/apps',
  request: zod.object({}),
  response: zod.array(Entities.App.schema),
  preRequest: __CAPSULE_MOCKS__
    ? async ({ resolve }) => {
        await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));
        resolve(Entities.App.mock);
      }
    : undefined,
}));
