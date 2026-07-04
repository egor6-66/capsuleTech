/**
 * Voice endpoints — прямой контракт к backend/voice (`/voice/*`, ADR 067 D2).
 *
 * Capability-сервис публичен: список движков нужен app-shell'у (свич в хедере)
 * без выбранного слова, поэтому апп идёт в voice напрямую (base `voice`),
 * не через learn-композицию. Сама озвучка играет по готовому `audio.url`
 * из learn-payload'ов — здесь только meta-вызовы.
 */

export const engines = defineEndpoint(({ zod }) => ({
  method: 'GET' as const,
  base: 'voice',
  path: '/voice/engines',
  request: zod.object({}),
  response: zod.object({
    engines: zod.array(zod.string()),
    default: zod.string(),
  }),
}));
