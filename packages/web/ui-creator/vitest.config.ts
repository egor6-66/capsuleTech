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
    include: ['src/**/__tests__/**/*.test.ts'],
    // jsdom нужен потому что vite-plugin-solid в test-mode подгружает
    // @testing-library/jest-dom setup, которое требует DOM-окружение.
    // Сами тесты pure-logic, jsdom-globals им не мешают.
    environment: 'jsdom',
    globals: false,
  },
});
