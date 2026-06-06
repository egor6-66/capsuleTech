import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid({ hot: false })],
  test: {
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: false,
    setupFiles: ['@testing-library/jest-dom/vitest'],
  },
});
