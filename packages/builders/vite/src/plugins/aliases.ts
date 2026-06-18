import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path, { basename, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

interface IProps {
  appRoot: string;
  workspaceRoot: string;
}

/**
 * Единый плагин для path-aliases.
 *
 * Источник правды — два файла:
 *   - `<workspace>/tsconfig.base.json`  — общие пути `@capsuletech/*`
 *   - `<app>/.capsule/paths.config.json` — локальные `@pages/*`, `@widgets/*`, …
 *
 * Что делает на старте Vite:
 *   1. Регистрирует Vite `resolve.alias` для всех ключей из `paths.config.json`
 *      (с поддержкой `/*` шаблонов через regex).
 *   2. Регистрирует Vite `resolve.alias` для `@capsuletech/*` из `tsconfig.base.json`
 *      — само-различающийся: alias добавляется ТОЛЬКО если src-файл существует
 *      на диске (workspace / monorepo). В capsule-test пакеты установлены из
 *      Verdaccio и src нет → alias не создаётся → Vite использует package.json
 *      exports (dist). В монорепо src есть → alias срабатывает → Vite читает src
 *      напрямую с полным HMR. Так решается capsule-test dist-tension без
 *      добавления "development" exports в каждый package.json.
 *   3. Пишет `<app>/.capsule/tsconfig.paths.json` со слитыми paths
 *      (base'овые + локальные, последние пере-проецированы относительно
 *      workspace-root). Apps'овый `tsconfig.json` делает
 *      `extends: [base, .capsule/tsconfig.paths.json]` — TypeScript
 *      multi-extends: paths из второго файла доминируют, но поскольку там
 *      ВСЕ нужные пути, base'овые не теряются.
 *
 * Зачем именно так: TypeScript не мержит `paths` через `extends` — child paths
 * полностью замещают parent paths. Если объявить `@pages/*` в app, base'овые
 * `@capsuletech/*` исчезают. Этот плагин обходит ограничение генерируя файл со
 * всем сразу.
 */
export const AliasesPlugin = ({ appRoot, workspaceRoot }: IProps): Plugin => ({
  name: 'capsule-aliases',
  enforce: 'pre',
  async config() {
    const appName = basename(appRoot);
    const baseConfigPath = join(workspaceRoot, 'tsconfig.base.json');
    const localPathsConfigPath = join(appRoot, '.capsule', 'paths.config.json');
    const outPath = join(appRoot, '.capsule', 'tsconfig.paths.json');

    const basePaths = await readBasePaths(baseConfigPath);
    const localRaw = await readLocalRaw(localPathsConfigPath);
    const localPathsForTs = projectLocalToWorkspace(localRaw, appName);

    // (1) TypeScript: write merged paths file
    const merged = { ...basePaths, ...localPathsForTs };
    const tsPathsOutput = {
      compilerOptions: {
        baseUrl: '../../../',
        paths: merged,
      },
    };
    await mkdir(join(appRoot, '.capsule'), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(tsPathsOutput, null, 2)}\n`, 'utf-8');

    // (2) Vite: build resolve.alias entries
    //   (a) local paths (@pages/*, @widgets/*, etc.)
    const localAliases = buildViteAliases(localRaw, appRoot);
    //   (b) workspace src aliases for @capsuletech/* — self-discriminating:
    //       alias is only added when the src target actually exists on disk.
    //       In capsule-test (packages installed from Verdaccio) there is no src/
    //       directory → alias is skipped → Vite falls back to package.json exports
    //       (dist). In the monorepo src/ is present → alias wins → HMR on src.
    const workspaceAliases = buildWorkspaceSrcAliases(basePaths, workspaceRoot);

    return {
      resolve: {
        alias: [...workspaceAliases, ...localAliases],
      },
    };
  },
});

async function readBasePaths(baseConfigPath: string): Promise<Record<string, string[]>> {
  if (!existsSync(baseConfigPath)) return {};
  try {
    const raw = await readFile(baseConfigPath, 'utf-8');
    const json = JSON.parse(stripJsonComments(raw));
    return (json?.compilerOptions?.paths ?? {}) as Record<string, string[]>;
  } catch (err) {
    console.warn(`[capsule-aliases] failed to read ${baseConfigPath}:`, err);
    return {};
  }
}

/**
 * Строит Vite resolve.alias для workspace-пакетов @capsuletech/* → src/.
 *
 * Само-различающийся алгоритм:
 *   - Читает paths из tsconfig.base.json (уже прочитаны как basePaths).
 *   - Для каждой записи проверяет: существует ли target-файл на диске
 *     (resolve(workspaceRoot, target[0])).
 *   - Если да — добавляет alias с абсолютным src-путём.
 *   - Если нет — пропускает (пакет установлен из registry, dist-only).
 *
 * Wildcard-записи (key = '@pkg/*', target = 'src/*') НЕ преобразуются в Vite
 * regex-алиасы намеренно: tsconfig.base.json уже не содержит wildcard для
 * web-ui (заменены явными subpath-записями). Если в будущем появится wildcard-entry
 * — она будет проигнорирована (target с /* не существует как файл), что
 * безопасно (fallback на exports).
 *
 * ВАЖНО — exact-match через RegExp:
 *   Vite применяет строковый alias как prefix: find='@capsuletech/web-ui' матчит
 *   '@capsuletech/web-ui/docs.json', заменяя его на '<src>/index.ts/docs.json'
 *   (бессмысленный путь). Чтобы alias срабатывал ТОЛЬКО для main entry (точное
 *   совпадение), `find` создаётся как RegExp /^<escaped-specifier>$/.
 *   Subpath-записи из tsconfig (например '@capsuletech/web-ui/icons') имеют
 *   собственный alias entry — они тоже exact-match через RegExp.
 *   Subpath'ы, которых нет в tsconfig (например '/docs.json'), не матчатся ни одним
 *   alias'ом → Vite fallthrough → node_modules → package.json exports map (dist).
 */
/** @internal — exported for unit-tests only */
export function buildWorkspaceSrcAliases(
  basePaths: Record<string, string[]>,
  workspaceRoot: string,
): ViteAliasEntry[] {
  const aliases: ViteAliasEntry[] = [];
  for (const [specifier, targets] of Object.entries(basePaths)) {
    const target = targets[0];
    if (!target) continue;
    // Skip wildcard entries — they can't point to a single real file.
    if (specifier.endsWith('/*') || target.endsWith('/*')) continue;
    const absTarget = resolve(workspaceRoot, target);
    // Self-discriminating check: only add alias if the src file actually exists.
    // In capsule-test the packages/ directory doesn't exist → existsSync false
    // → alias skipped → Vite uses package.json exports (dist).
    if (!existsSync(absTarget)) continue;
    // Use RegExp with ^ and $ anchors to get exact-match semantics.
    // A plain string find in Vite is prefix-based: '@capsuletech/web-ui' would
    // also match '@capsuletech/web-ui/docs.json', building the invalid path
    // '<src>/index.ts/docs.json'. The regex ensures only the exact specifier
    // matches, letting subpaths without an alias entry fall through to the
    // package.json exports map.
    aliases.push({ find: new RegExp(`^${escapeRegex(specifier)}$`), replacement: absTarget });
  }
  // Sort most-specific first (longer pattern string = more specific).
  // With exact-match regexes there is no prefix-capture risk, but sorting still
  // ensures deterministic ordering when multiple patterns could match the same id
  // in edge cases.
  aliases.sort((a, b) => String(b.find).length - String(a.find).length);
  return aliases;
}

async function readLocalRaw(localPathsConfigPath: string): Promise<Record<string, string[]>> {
  if (!existsSync(localPathsConfigPath)) return {};
  try {
    const raw = await readFile(localPathsConfigPath, 'utf-8');
    const json = JSON.parse(stripJsonComments(raw));
    const out: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(json)) {
      out[key] = Array.isArray(value) ? (value as string[]) : [value as string];
    }
    return out;
  } catch (err) {
    console.warn(`[capsule-aliases] failed to read ${localPathsConfigPath}:`, err);
    return {};
  }
}

function projectLocalToWorkspace(
  local: Record<string, string[]>,
  appName: string,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, arr] of Object.entries(local)) {
    out[key] = arr.map((v) => `apps/${appName}/${v}`.replace(/\\/g, '/'));
  }
  return out;
}

/** @internal — exported for unit-tests only */
export interface ViteAliasEntry {
  find: string | RegExp;
  replacement: string;
}

function buildViteAliases(local: Record<string, string[]>, appRoot: string): ViteAliasEntry[] {
  const aliases: ViteAliasEntry[] = [];
  for (const [key, arr] of Object.entries(local)) {
    const target = arr[0];
    if (!target) continue;
    if (key.endsWith('/*') && target.endsWith('/*')) {
      const cleanKey = key.slice(0, -2);
      const cleanPath = target.slice(0, -2);
      aliases.push({
        find: new RegExp(`^${escapeRegex(cleanKey)}/(.*)`),
        replacement: path.resolve(appRoot, `${cleanPath}/$1`),
      });
    } else {
      aliases.push({
        find: key,
        replacement: path.resolve(appRoot, target),
      });
    }
  }
  // Sort most-specific first — same reason as in buildWorkspaceSrcAliases.
  aliases.sort((a, b) => String(b.find).length - String(a.find).length);
  return aliases;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// tsconfig.base.json is allowed to have // and /* */ comments; strip them
// before JSON.parse (which doesn't tolerate them).
function stripJsonComments(input: string): string {
  return input.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
