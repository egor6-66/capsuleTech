export default defineCapsuleConfig({
  devServerPort: 3050,
  deploy: {
    // playground раздаётся под `/` на preview-сервере (testing-hub).
    root: true,
    mocks: true,
  },
});
