/**
 * `IAuthCapability` — leaf-контракт для cross-domain consumer'ов (per ADR 047 D2).
 *
 * Назначение: позволяет пакетам runtime-зоны (`web-access`) или другим
 * domain-пакетам читать auth-state БЕЗ прямого import'а из `@capsuletech/web-auth`.
 * Этот файл — zero-dep types only. Импорт безопасен из любой зоны.
 *
 * Implementation lives in `@capsuletech/web-auth` (domain) and is wired by the
 * app at boot — apps pass an `IAuthCapability` instance to consumer setup
 * functions (`setupAccess({ auth: ... })`).
 *
 * **Why this exists:** до W5 (`docs/_meta/web-audit-cross-imports.md`)
 * `@capsuletech/web-access` напрямую импортил `useAuth` из `@capsuletech/web-auth/session`
 * — runtime → domain направление, нарушение ADR 047 D2. Контракт здесь
 * разворачивает зависимость: access потребляет контракт, auth реализует.
 */
export interface IAuthCapability {
  /**
   * Роль текущего пользователя. `null` если не аутентифицирован
   * или не известно.
   *
   * Реактивный геттер — consumer вызывает в Solid tracking-scope для
   * автоматической ре-эвалюации.
   */
  readonly role: string | null;

  /**
   * `true` если есть валидная аутентифицированная сессия.
   *
   * Реактивный геттер — аналогично `role`.
   */
  readonly isAuthed: boolean;
}
