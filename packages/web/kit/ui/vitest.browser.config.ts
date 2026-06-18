import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

/**
 * Vitest browser-mode config (Playwright / Chromium provider).
 *
 * Separate from vitest.config.ts (jsdom) — both runners coexist:
 *   jsdom:   pnpm test          → structural / logic assertions
 *   browser: pnpm test:browser  → computed styles, :focus-visible, real keyboard events, a11y
 *
 * Browser tests live in: src/**\/__browser__\/**\/*.browser.test.{ts,tsx}
 *
 * First-time setup: npx playwright install chromium
 */
export default defineConfig({
  // @tailwindcss/vite must come before solid plugin so Tailwind utilities
  // are processed by the Vite pipeline before JSX transformation.
  plugins: [tailwindcss(), solid({ hot: false })],
  test: {
    include: ['src/**/__browser__/**/*.browser.test.{ts,tsx}'],
    // Do NOT set environment: 'jsdom' — browser-mode replaces it with real Chromium.
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    // Bootstrap CSS custom properties (theme tokens) so that getComputedStyle()
    // assertions on computed colours and radii work without the full web-style build.
    setupFiles: ['./src/primitives/button/__browser__/_browser.setup.ts'],
    // Do NOT include vitest.setup.ts — it patches jsdom globals (ResizeObserver mock,
    // matchMedia stub, CSSStyleDeclaration.setProperty) that are unnecessary and
    // potentially harmful in a real browser environment.
    //
    // Several deps ship .jsx/.tsx source that Node cannot process natively.
    // Keep in sync with vitest.config.ts server.deps.inline list.
    server: {
      deps: {
        inline: [
          /@capsuletech\/web-dnd/,
          /@capsuletech\/web-router/,
          /@tanstack\/solid-router/,
          /@solidjs\/meta/,
          /@kobalte\/core/,
          /solid-prevent-scroll/,
          /solid-presence/,
        ],
      },
    },
  },
});
