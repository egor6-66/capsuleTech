export default defineAppConfig({
  meta: {
    tags: ['click'],
  },
  aliases: {},
  // web-renderer как глобал `Renderer.*` (ADR 033) — апп монтирует <Renderer.View>
  // без forbidden import. Голый движок-по-JSON, переиспользуемый в любом месте.
  packages: ['@capsuletech/web-renderer'],
});
