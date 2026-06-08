/**
 * Auth endpoint — контракт `/auth/login`.
 *
 * `services.api.auth.login(input)` — генерируется EndpointsRegistryPlugin'ом,
 * вызывается из FSM пакета `@capsuletech/web-auth` (Auth.Login).
 *
 * Инструменты инжектятся объектом `({ zod, utils }) => …` (единая конвенция).
 * Мок — через `preRequest`: короткозамыкает pipeline без сетевого запроса,
 * данные из `gen` (по схеме ответа), роль эхо-возвращается. Сценарная логика
 * (проверка пароля) — в самом `preRequest`. Дальше апп работает так, будто
 * получил данные из реального API.
 *
 * Mock creds: пароль `123` (любая роль). Иной пароль — reject `Invalid password`.
 */

import { gen } from '@capsuletech/shared-zod/gen';

export const login = defineEndpoint(({ zod, utils }) => {
  const responseSchema = zod.object({
    token: zod.string(),
    role: zod.string(),
  });

  return {
    method: 'POST',
    path: '/auth/login',
    request: zod.object({
      role: zod.string(),
      password: zod.string(),
    }),
    response: responseSchema,
    // Мок только под build-time флагом __CAPSULE_MOCKS__. Реальная сборка → сеть.
    preRequest: __CAPSULE_MOCKS__
      ? async ({ input, resolve, reject }) => {
          await utils.delay(700); // имитация round-trip (виден submitting-state формы)
          if (input.password === '123') {
            const data = gen(responseSchema, { seed: Date.now() });
            resolve({ token: data.token, role: input.role });
            return;
          }
          reject(new Error('Invalid password'));
        }
      : undefined,
  };
});
