import { readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { libConfig } from '@capsule/shared-vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Multi-entry: bundle на каждый файл внутри src/components/*/. Это нужно,
// чтобы exports вида `@capsule/ui/card/parts` резолвились в реальный
// dist/components/card/parts.mjs, а не только в index.mjs одной папки.
const componentsDir = resolve(__dirname, 'src/components');
const componentEntries: Record<string, string> = {};
for (const compName of readdirSync(componentsDir)) {
  const compDir = resolve(componentsDir, compName);
  try {
    if (!statSync(compDir).isDirectory()) continue;
  } catch {
    continue;
  }
  for (const file of readdirSync(compDir)) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    if (/\.(d\.ts|test\.ts|spec\.ts)$/.test(file)) continue;
    const stem = file.replace(/\.(ts|tsx)$/, '');
    // Для index → ключ `components/<comp>/index` → dist/components/<comp>/index.mjs.
    // Для прочих файлов аналогично — сохраняем структуру папок.
    componentEntries[`components/${compName}/${stem}`] = `src/components/${compName}/${file}`;
  }
}

export default libConfig({
  entry: {
    index: 'src/index.ts',
    ...componentEntries,
  },
  name: 'CapsuleUi',
});
