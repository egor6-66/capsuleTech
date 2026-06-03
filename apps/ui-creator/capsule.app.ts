export default defineAppConfig({
  meta: {
    tags: ['click'],
  },
  aliases: {},
  api: () => ({
    bases: { default: 'http://172.16.211.143:15880/api/v1' },
  }),
});
