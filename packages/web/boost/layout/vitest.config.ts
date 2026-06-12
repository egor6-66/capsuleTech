import { defineConfig } from 'vitest/config';

// Scaffold (B1) — no tests yet. Phase B2 (Matrix relocation) brings tests with
// the code from web-shell. `passWithNoTests: true` keeps CI green meanwhile.
export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
  },
});
