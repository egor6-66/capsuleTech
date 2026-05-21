import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid({ hot: false })],
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    // jsdom is required for component render tests (matrix resize, flex items).
    // Pure-logic tests (normalizeSlot) are unaffected — jsdom globals don't interfere.
    environment: 'jsdom',
    globals: false,
  },
});
