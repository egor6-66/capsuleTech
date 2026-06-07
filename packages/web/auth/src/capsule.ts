/**
 * @capsuletech/web-auth/capsule
 *
 * Манифест пакета для механизма регистрации (ADR 033).
 *
 * App подключает пакет в capsule.app.ts:
 *   packages: ['@capsuletech/web-auth']
 *
 * После регистрации (когда блоки готовы) будут доступны глобалы:
 *   - `Auth.LoginForm`     → components (form-блок из ../ui)
 *   - `Controllers.Auth`   → controllers (AuthController из ../controllers)
 *
 * Имя 'Auth' — не JS-builtin (см. web-core/module: имя не должно совпадать
 * с Map/Set/Date/… иначе TS2451 в packages.d.ts).
 *
 * TODO(owner-web-auth): заполнить components/controllers, когда ../ui и
 * ../controllers реализованы.
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';

export default defineCapsuleModule({
  name: 'Auth',
  components: {
    // LoginForm: AuthLoginForm, // TODO(owner-web-auth)
  },
  // controllers: { Auth: AuthController }, // TODO(owner-web-auth)
});
