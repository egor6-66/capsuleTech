export default defineCapsuleConfig({
  base: '/playground/',
  devServerPort: 3022,
  deploy: {
    // playground раздаётся под `/` на preview-сервере (testing-hub).
    root: true,
    mocks: true,
  },
});
