import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // hot:false — отключаем solid-refresh для тестов (file:///@solid-refresh URL
  // ругает jsdom). Зеркалит web-auth/web-core конфиг.
  plugins: [solid({ hot: false })],
  resolve: {
    // Vite 8 native tsconfig-paths — резолвит @capsuletech/* в src.
    tsconfigPaths: true,
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    // jsdom нужен для CapsuleOutlet render-теста (solid-js/web `render`
    // создаёт реальный DOM). useRouter/wrap/beforeLoad — pure-логика,
    // jsdom-globals им не мешают.
    environment: 'jsdom',
    globals: false,
    // vite-plugin-solid auto-injects '@testing-library/jest-dom/vitest' как setupFile,
    // когда находит пакет резолвимым — явное упоминание здесь снимает double-injection
    // и гарантирует резолв в нашем package-context'е. См. web-dnd vitest.config.
    setupFiles: ['@testing-library/jest-dom/vitest'],
    // server.deps.inline — пакеты со страничными dev-условиями .jsx/.tsx.
    // Node не может обработать JSX → Vite-трансформ inline'ом.
    // @tanstack/solid-router exports CapsuleOutlet'у `Outlet` через
    // dev-config .jsx — inline обязателен.
    server: {
      deps: {
        inline: [/solid-js/, /@tanstack\/solid-router/],
      },
    },
  },
});
