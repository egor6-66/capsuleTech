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
 *
 * SIDE-EFFECT (module-load): регистрация `services.authApi` через `registerPackageServices`.
 * Codegen импортирует `/capsule` eager на bootstrap (до рендера Feature/Controller),
 * поэтому регистрация гарантированно происходит до первого монтирования LogicWrapper.
 *
 * NOTE(spike): сейчас регистрация живёт здесь, что слегка нарушает «dep-light» принцип
 * для `/capsule` (добавляет зависимость от session-store). В продакшн-итерации её
 * переместим в codegen-bootstrap либо отдельный init-файл — тогда `/capsule` останется
 * чисто манифестом. Для спайка (ADR 039 §spike) — приемлемо.
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { registerPackageServices } from '@capsuletech/web-core';
import { AuthLogin } from './controllers/index';
import { defaultAuthSession, useAuth } from './session/index';
import type { IAuthUser } from './types';

// ─── Module augmentation: типизация services.authApi ─────────────────────────

declare module '@capsuletech/web-core' {
  interface CapsuleServices {
    /**
     * Auth-services (web-auth пакет). Опциональны: не каждый апп подключает web-auth;
     * `services.authApi` присутствует только если пакет зарегистрирован через `/capsule`.
     * Поле необязательно чтобы не сломать типизацию `IServices` в logic-wrapper
     * для аппов без web-auth.
     */
    authApi?: {
      /** Очистить auth-сессию (defaultAuthSession). */
      logout: () => void;
      /**
       * Реактивно читает: аутентифицирована ли текущая сессия.
       * Отражает восстановленную сессию после `configureAuthSession`.
       * Вызывается внутри Feature-хэндлера (реактивный scope) — корректно.
       */
      isAuthed: () => boolean;
      /**
       * Реактивно читает текущего пользователя сессии.
       * `null` если сессия не аутентифицирована.
       */
      user: () => IAuthUser | null;
    };
  }
}

// ─── Регистрация services.authApi (side-effect на module-load) ───────────────

registerPackageServices('authApi', {
  logout: () => defaultAuthSession.logout(),
  isAuthed: () => useAuth().isAuthed,
  user: () => useAuth().user,
});

// ─── Манифест пакета ─────────────────────────────────────────────────────────

export default defineCapsuleModule({
  name: 'Auth',
  components: {
    Login: AuthLogin,
  },
});
