import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // solid: трансформирует JSX в manifests/*.tsx (icon: () => <Icon />).
  // hot: false — отключаем solid-refresh для тестов.
  plugins: [solid({ hot: false })],
  resolve: {
    // Vite 8 native tsconfig-paths — резолвит @capsuletech/* в исходники
    // по tsconfig.base.json (иначе уходит в node_modules → dist, которого нет в dev).
    tsconfigPaths: true,
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    // jsdom нужен потому что vite-plugin-solid в test-mode подгружает
    // @testing-library/jest-dom setup, которое требует DOM-окружение.
    // Сами тесты pure-logic, jsdom-globals им не мешают.
    environment: 'jsdom',
    globals: false,
    // vitest.setup.ts полифилит matchMedia + ResizeObserver — нужно тестам,
    // которые импортят реальный web-ui kit (palette/Palette.tsx и далее).
    // Существующие controllers/__tests__ мокают kit вручную; полифилы им не мешают.
    setupFiles: ['./vitest.setup.ts'],
    // Несколько deps поставляются как .jsx/.tsx из dev-conditions.
    // Node не умеет JSX нативно — inline заставляет vite-plugin-solid трансформировать.
    server: {
      deps: {
        inline: [
          /lucide-solid/,
          /@capsuletech\/web-ui/,
          /@capsuletech\/web-style/,
          /@kobalte\/core/,
          /@corvu\//,
          /solid-prevent-scroll/,
          /solid-presence/,
          /solid-motionone/,
        ],
      },
    },
  },
});
