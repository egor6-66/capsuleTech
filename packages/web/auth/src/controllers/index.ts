/**
 * @capsuletech/web-auth/controllers
 *
 * HCA-АДАПТЕР — `Controllers.Auth`: generic auth-FSM `idle → submitting →
 * authed / error`, параметризованная стратегией (флоу НЕ дублируется на каждую
 * стратегию). Управляется через `useEmit` (ADR 032): form-блоки (../ui) только
 * эмиттят, вся логика — в Controller.
 *
 * Эмиттит ИМЕНОВАННЫЕ события `onLogin` / `onLogout` / `onError` (IAuthEvents)
 * в app-Feature; phantom `__events` → типизация `target.payload` (см.
 * package-event-flow, NOT универсальный onClick+tags).
 *
 * Единственный subpath с зависимостью на `@capsuletech/web-core`.
 *
 * TODO(owner-web-auth): реализовать AuthController (default export):
 *   - принимает выбранную стратегию (../role и т.д.) + services.api;
 *   - submitting: services.api.auth.login(...) → session-update;
 *   - authed: emit onLogin; error: emit onError;
 *   - зарегистрировать в ../capsule.ts как controllers: { Auth: AuthController }.
 */

export {};
