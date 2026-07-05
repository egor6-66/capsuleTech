export default defineAppConfig({
  // Словарь meta-тегов аппа (типизирует `meta.tags` в слоях):
  // word/speak — тайл слова и его 🔊; search — поиск-input библиотеки;
  // engine — свич TTS-движка, image-engine — свич image-движка (Shell.Picker).
  meta: {
    tags: ['click', 'word', 'speak', 'search', 'engine', 'image-engine'],
  },
  aliases: {},
  // Learn-зона (ADR 055 D5) + app-shell как в playground (единый UI/UX-флоу
  // фича-аппов): boost-layout (Layouts.Matrix app-shell) + web-shell (Shell.* хедер/тема).
  packages: [
    '@capsuletech/web-learn',
    '@capsuletech/boost-layout',
    '@capsuletech/web-shell',
    '@capsuletech/web-placeholders',
  ],
  router: {
    transition: true,
  },
  // API → single-origin '/api' через gateway (ADR 068): dev = prod, same-origin,
  // CORS не нужен. Маршрутизация (`/api/learn/*` → learn :8003, `/api/voice/*` →
  // voice :8001) живёт только в nginx gateway (`docker/gateway/`), не в аппе.
  // Ключ `voice` раздельный — семантический шов (ADR 067: capability-сервисы
  // публичны; в prod базы могут разойтись).
  api: () => ({
    bases: { default: '/api', voice: '/api' },
  }),
});
