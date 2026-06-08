/**
 * @capsuletech/web-auth/capsule
 *
 * Манифест пакета для механизма регистрации (ADR 033).
 *
 * App подключает пакет в capsule.app.ts:
 *   packages: ['@capsuletech/web-auth']
 *
 * После регистрации доступен глобал:
 *   - `Auth.Login` → connected component: Controller-scope (auth-FSM) + форма.
 *
 * Регистрация как component (НЕ controller) — по канону web-shell/MatrixController:
 * codegen строит namespace `Auth.Login.Events` из phantom `__events` в `components[X]`.
 *
 * Имя 'Auth' — не JS-builtin (нет конфликта с Map/Set/Date/…).
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { AuthLogin } from './controllers/index';

export default defineCapsuleModule({
  name: 'Auth',
  components: {
    Login: AuthLogin,
  },
});
