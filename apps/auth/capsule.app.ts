export default defineAppConfig({
  // Словарь meta-тегов аппа (типизирует `meta.tags` в слоях):
  // to-login/to-register — переключение форм вход/регистрация;
  // logout/continue — кнопки authed-панели (выход / переход по ?next=).
  meta: {
    tags: ['to-login', 'to-register', 'logout', 'continue'],
  },
  aliases: {},
  // Auth-домен (ADR 068 D7): блоки Auth.Login/Auth.Register + services.authApi.
  // Без boost-layout/web-shell — минимализм: форма по центру, app-shell хром не нужен.
  packages: ['@capsuletech/web-auth'],
  // API → single-origin '/api' через gateway (ADR 068): dev = prod, same-origin.
  // Маршрутизация `/api/auth/*` → backend/auth :8004 живёт в nginx gateway.
  api: () => ({
    bases: { default: '/api' },
  }),
});
