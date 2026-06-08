/**
 * Auth endpoints namespace.
 *
 * `services.api.auth.login(input)` — генерируется EndpointsRegistryPlugin'ом.
 * Mock через `preRequest` — `resolve(data)` короткозамыкает pipeline без сетевого запроса.
 *
 * Mock creds: `user` / `123`. Возвращает `{ token: 'mock-jwt-...' }`.
 * Любые другие — reject `Error('Invalid credentials')`.
 *
 * 800ms задержка симулирует сетевой round-trip — чтобы наглядно увидеть
 * submitting-state в UI (spinner на кнопке + disabled inputs).
 */

const MOCK_LATENCY_MS = 800;

export const login = defineEndpoint(({ zod }) => ({
  method: 'POST',
  path: '/auth/login',
  request: zod.object({
    login: zod.string(),
    password: zod.string(),
  }),
  response: zod.object({
    token: zod.string(),
  }),
  // Мок только когда __CAPSULE_MOCKS__ (build-time флаг). В реальной сборке
  // (без флага) preRequest = undefined → endpoint идёт в сеть на `/api/auth/login`.
  preRequest: __CAPSULE_MOCKS__
    ? async ({ input, resolve, reject }) => {
        await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));
        if (input.login === 'user' && input.password === '123') {
          resolve({ token: `mock-jwt-${Date.now()}` });
          return;
        }
        reject(new Error('Invalid credentials'));
      }
    : undefined,
}));
