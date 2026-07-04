export default defineCapsuleConfig({
  devServerPort: 3200,
  // ADR 068 D5/D6: все фронты — один origin, path-роутинг. Через dev-gateway
  // (docker/gateway, :8080/auth/) и в прод-nginx апп живёт под этим base;
  // прямой порт :3200/auth/ рендерит форму, но `/api` до vite-builder apiProxy
  // работает только через gateway.
  base: '/auth/',
});
