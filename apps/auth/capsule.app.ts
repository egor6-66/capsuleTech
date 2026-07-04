export default defineAppConfig({
  // Словарь meta-тегов аппа (типизирует `meta.tags` в слоях):
  // logout/continue — кнопки authed-панели (выход / переход по ?next=).
  // Переключение форм (to-login/to-register) живёт внутри пакетного Auth.Gate.
  meta: {
    tags: ['logout', 'continue'],
  },
  // Query-side алиасы (ADR 005): FSM web-auth собирает значения формы через
  // `store.values(['@input'])` и вешает loading через `patch(['@submit'])` —
  // алиасы обязаны покрывать теги полей пакетных форм (login/password/confirm).
  aliases: {
    '@input': ['login', 'password', 'confirm'],
    '@submit': ['submit'],
  },
  // Auth-домен (ADR 068 D7): блоки Auth.Login/Auth.Register + services.authApi.
  // Без boost-layout/web-shell — минимализм: форма по центру, app-shell хром не нужен.
  packages: ['@capsuletech/web-auth'],
  // API → single-origin '/api' через gateway (ADR 068): dev = prod, same-origin.
  // Маршрутизация `/api/auth/*` → backend/auth :8004 живёт в nginx gateway.
  api: () => ({
    bases: { default: '/api' },
  }),
});
