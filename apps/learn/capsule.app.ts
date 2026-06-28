export default defineAppConfig({
  meta: {
    tags: ['click'],
  },
  aliases: {},
  // Top-level learn-зона (ADR 055 D5). Регистрирует глобалы Learn.* через
  // @capsuletech/web-learn/capsule (ADR 033).
  packages: ['@capsuletech/web-learn'],
});
