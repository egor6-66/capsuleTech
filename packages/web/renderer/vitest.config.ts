import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // hot:false — отключаем solid-refresh для тестов (иначе jsdom получает
  // file:///@solid-refresh URL и ругается на 'filename must be ...').
  plugins: [solid({ hot: false })],
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    // jsdom нужен для render-тестов (создание элементов, dispatchEvent).
    environment: 'jsdom',
    globals: false,
  },
});
