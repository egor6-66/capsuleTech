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
});
