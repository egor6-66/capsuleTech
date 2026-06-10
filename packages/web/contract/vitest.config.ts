import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    globals: false,
    // Skeleton phase — no tests yet; removed when first implementation lands.
    passWithNoTests: true,
  },
});
