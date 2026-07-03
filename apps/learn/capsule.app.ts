export default defineAppConfig({
  meta: {
    tags: ['click'],
  },
  aliases: {},
  // Learn-зона (ADR 055 D5) + app-shell как в playground (единый UI/UX-флоу
  // фича-аппов): boost-layout (Layouts.Matrix app-shell) + web-shell (Shell.* хедер/тема).
  packages: ['@capsuletech/web-learn', '@capsuletech/boost-layout', '@capsuletech/web-shell'],
  router: {
    transition: true,
  },
  // API → backend/learn (ADR 055 D2). DEV: абсолютный localhost-base (бэк на :8003);
  // браузер ходит cross-origin → бэку нужен CORS-middleware. PROD-base — конфигом позже.
  // `voice` — прямой поход в capability-сервис (ADR 067: сервисы публичны; learn-BFF
  // композитит выдачи, но статичные capability-вызовы вроде списка движков — напрямую).
  api: () => ({
    bases: { default: 'http://127.0.0.1:8003', voice: 'http://127.0.0.1:8001' },
  }),
});
