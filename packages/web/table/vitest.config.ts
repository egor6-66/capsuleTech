import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid({ hot: false })],
  test: {
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    // SKELETON: пока нет тестов (код переносится owner-web-table). Без этого
    // vitest падает «No test files found» на CI. Убрать когда появятся тесты.
    passWithNoTests: true,
    environment: 'jsdom',
    globals: false,
    setupFiles: ['@testing-library/jest-dom/vitest'],
  },
});
