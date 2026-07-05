/**
 * Image endpoints — прямой контракт к backend/image (`/image/*`, ADR 067/068).
 *
 * Зеркало `endpoints/voice.ts`: capability-сервис публичен, список движков нужен
 * app-shell'у (свич в хедере) без картинки, поэтому апп идёт напрямую. База —
 * `default` ('/api', single-origin gateway ADR 068): маршрут `/api/image/*` →
 * backend/image живёт в nginx gateway, не в аппе. Сама генерация картинок пойдёт
 * по готовому `image.url` из learn-payload'ов (будущий шаг) — здесь только meta.
 */

export const engines = defineEndpoint(({ zod }) => ({
  method: 'GET' as const,
  path: '/image/engines',
  request: zod.object({}),
  response: zod.object({
    engines: zod.array(zod.string()),
    default: zod.string(),
  }),
}));
