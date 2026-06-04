import { mergeConfig, type UserConfig } from 'vite';

export const appConfig = (config: UserConfig, idDev: boolean) => {
  return mergeConfig(
    {
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        reportCompressedSize: true,
        sourcemap: !idDev,
        minify: idDev ? false : 'esbuild',
        commonjsOptions: {
          transformMixedEsModules: true,
        },
      },
      css: {
        devSourcemap: idDev,
      },
      optimizeDeps: {
        exclude: ['@tailwindcss/oxide', '@tailwindcss/oxide-win32-x64-msvc'],
      },
      server: {
        host: true,
        // Vite 8: forward browser console messages (console.log, warn, error)
        // to the terminal. Useful for dev — no more switching to browser DevTools
        // just to read a log line.
        forwardConsole: true,
      },
    },
    config,
  );
};
