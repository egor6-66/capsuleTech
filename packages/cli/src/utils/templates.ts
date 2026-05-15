import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Резолвит путь до template-папки. Работает и в dev (TS через jiti, каждый
 * файл со своим `__dirname`), и в prod (Vite-бандл `dist/index.mjs`, у всех
 * call-site'ов один и тот же `__dirname = dist/`).
 *
 * Порядок кандидатов — сверху вниз; первый существующий выигрывает:
 * - `<caller>/templates/<name>`    → prod (dist/index.mjs → dist/templates/<name>)
 * - `<caller>/../templates/<name>` → dev `src/actions/` → `src/templates/<name>`
 *
 * В prod templates кладёт туда `staticCopyPlugin` из shared-vite (см. vite.config.mts).
 */
export const resolveTemplateDir = (callerUrl: string, name: string): string => {
  const callerDir = dirname(fileURLToPath(callerUrl));
  const candidates = [
    resolve(callerDir, 'templates', name),
    resolve(callerDir, '../templates', name),
    resolve(callerDir, '../../templates', name),
  ];
  return candidates.find(existsSync) ?? candidates[0];
};
