/**
 * Viewer — аутентифицированный пользователь (вьювер).
 *
 * Single source of truth для формы вьювера. Корневая `Features.App` держит его
 * в контексте (`viewer: Entities.Viewer.Row | null`, null = гость).
 *
 * Тип читается глобалом `Entities.Viewer.Row` (codegen `$infer`) — без импорта.
 * Сейчас только `role`; домен расширяется здесь (id/name/permissions…).
 */
const Viewer = Entity(({ zod }) => ({
  schema: zod.object({
    role: zod.string(),
  }),
}));

export default Viewer;
