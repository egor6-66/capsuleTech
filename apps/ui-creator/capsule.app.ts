export default defineAppConfig({
  meta: {
    tags: ['click'],
  },
  aliases: {},
  packages: ['@capsuletech/studio'],
  api: () => ({
    bases: { default: 'http://172.16.211.143:15880/api/v1' },
  }),
});
