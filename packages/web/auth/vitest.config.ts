import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid({ hot: false })],
  resolve: {
    // Vite 8 native tsconfig-paths — резолвит @capsuletech/* в исходники
    // по tsconfig.base.json (иначе уходит в node_modules → dist, которого нет в dev).
    tsconfigPaths: true,
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    // server.deps.inline: deps, которые содержат .jsx/.tsx в dist.
    // Node нативно не может обработать JSX — инлайним через Vite transform.
    // Паттерн из @capsuletech/web-shell vitest.config.ts.
    server: {
      deps: {
        inline: [
          /solid-js/,
          /@capsuletech\/web-core/,
          /@capsuletech\/web-ui/,
          /@capsuletech\/web-state/,
          /@capsuletech\/web-query/,
          /@capsuletech\/web-router/,
          /@capsuletech\/web-style/,
          /@capsuletech\/shared-zod/,
          /@kobalte\/core/,
          /@corvu\//,
          /@tanstack\/solid-router/,
          /@xstate\/solid/,
          /@solidjs\/meta/,
          /lucide-solid/,
          /solid-prevent-scroll/,
          /solid-presence/,
          /solid-motionone/,
        ],
      },
    },
  },
});
