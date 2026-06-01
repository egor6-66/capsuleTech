/**
 * Incidents endpoints namespace.
 *
 * `services.api.incidents.list()` — генерируется EndpointsRegistryPlugin'ом.
 * Response schema — `Entities.Incident.schema` (global, доступен после systemic
 * layer init ordering fix в ExportGeneratorPlugin). Mock через `preRequest` —
 * `resolve(data)` короткозамыкает pipeline без сетевого запроса. Latency 200ms
 * симулирует round-trip — видно loading-state в UI.
 */
const MOCK_LATENCY_MS = 200;

export const list = defineEndpoint((z) => ({
  method: 'GET',
  path: '/incidents',
  request: z.object({}),
  response: z.array(Entities.Incident.schema),
  // Мок только когда __CAPSULE_MOCKS__ (build-time флаг). В реальной сборке
  // (без флага) preRequest = undefined → endpoint идёт в сеть на `/api/incidents`.
  preRequest: __CAPSULE_MOCKS__
    ? async ({ resolve }) => {
        await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));
        resolve(Entities.Incident.mock);
      }
    : undefined,
}));
