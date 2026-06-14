import { libConfig } from '../builders/lib/src';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    runtime: 'src/runtime.ts',
  },
  name: 'CapsuleDesktop',
  runtime: 'node',
  // @tauri-apps/* are dynamic-import-only in runtime.ts (browser-side).
  // Mark them external so rolldown doesn't try to bundle what is not installed
  // at build-time in apps without Tauri. Consumer apps install them themselves.
  external: [/^@tauri-apps\//],
  // tsconfig.json excludes __tests__ so dts plugin won't emit test declaration files
});
