/**
 * Track — сущность трека (single source of truth, без UI).
 *
 * Жизненный цикл: участник кидает трек в предложку (`pending`) → ревью →
 * `approved` (улетает в сет-лист) либо `rejected`.
 *
 * Медиа (audioUrl/tabUrl) в первой итерации — просто строки-ссылки; реальная
 * загрузка/хранение в БД появится позже. Тип читается глобалом `Entities.Track.Row`.
 */
const Track = Entity(({ zod }) => ({
  schema: zod.object({
    id: zod.string(),
    title: zod.string(),
    author: zod.string(),
    lyrics: zod.string(),
    audioUrl: zod.string(),
    tabUrl: zod.string(),
    status: zod.enum(['pending', 'approved', 'rejected']),
  }),
}));

export default Track;
