/**
 * Viewer — аутентифицированный пользователь auth-аппа.
 *
 * Форма зеркалит контракт backend/auth `GET /auth/me` → `UserOut { id, login, role }`
 * (payload `onLogin { user }` пакета web-auth, session v2 — БЕЗ token, ADR 068 D3).
 *
 * Тип читается глобалом `Entities.Viewer.Row` (codegen `$infer`) — без импорта.
 * Корневая `Features.App` держит его в контексте (`viewer: Row | null`, null = гость).
 */
const Viewer = Entity(({ zod }) => ({
  schema: zod.object({
    id: zod.number().optional(),
    login: zod.string().optional(),
    role: zod.string(),
  }),
}));

export default Viewer;
