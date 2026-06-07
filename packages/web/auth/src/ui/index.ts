/**
 * @capsuletech/web-auth/ui
 *
 * Переиспользуемые themed form-блоки на `@capsuletech/web-ui` (правило: интерфейс
 * из ui-kit, не raw div/native). Config-driven по полям стратегии (`IAuthStrategy.fields`)
 * — НЕ хардкод-разметка per app. Headless-апп НЕ подключает /ui.
 *
 * TODO(owner-web-auth): реализовать LoginForm-блок (рендерит поля стратегии:
 * Select(role)/Input(password)/Button по конфигу; брендинг/копирайт — props аппа).
 * Старт — по playground views/authForm (Select-роль/Input/Button, theme-токены).
 * Зарегистрировать в ../capsule.ts как components: { LoginForm }.
 */

export {};
