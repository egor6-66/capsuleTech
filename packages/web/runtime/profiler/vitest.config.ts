import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // hot:false — solid-refresh не нужен в тестах (иначе jsdom получает file:// URL).
  plugins: [solid({ hot: false })],
  test: {
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    // Дефолт node (factory/bus/trace-тесты); компонент-тесты переопределяют на
    // jsdom через `/* @vitest-environment jsdom */` докблок в самом файле.
    environment: 'node',
    globals: false,
    setupFiles: [],
    // solid-js помечаем external — это гасит config-хук vite-plugin-solid,
    // который иначе авто-подставляет несуществующий в пакете
    // @testing-library/jest-dom/vitest (он возвращает свой test-override только
    // когда сам выставляет server.deps; задав external — он его не трогает).
    server: {
      deps: {
        external: [/solid-js/],
      },
    },
  },
});
