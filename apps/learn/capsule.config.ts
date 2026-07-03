export default defineCapsuleConfig({
  devServerPort: 3100,
  // ADR 068 D5/D6: все фронты — один origin, path-роутинг. Через dev-gateway
  // (docker/gateway, :8080/learn/) и в прод-nginx апп живёт под этим base;
  // прямой порт тоже продолжает работать — :3100/learn/.
  base: '/learn/',
});
