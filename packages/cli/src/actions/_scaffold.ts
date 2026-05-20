import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { execa } from 'execa';
import { isCi } from '../cli/runner';
import type { CliMode } from '../context';
import { kit } from '../kit';
import { generateFromTemplates } from '../utils/generateFromTemplates';
import { resolveTemplateDir } from '../utils/templates';

export const TEMPLATES = {
  workspace: resolveTemplateDir(import.meta.url, 'workspace'),
  app: resolveTemplateDir(import.meta.url, 'app'),
  lib: resolveTemplateDir(import.meta.url, 'lib'),
} as const;

const IGNORED_ENTRIES = new Set(['.git', '.idea', '.vscode', '.DS_Store', 'Thumbs.db']);

export type ScaffoldKind = keyof typeof TEMPLATES;

export interface ScaffoldOptions {
  kind: ScaffoldKind;
  title: string;
  subDir?: 'apps' | 'packages';
  /** Уже известное имя (из CLI-аргументов). Если не задано — спросим в интерактиве. */
  name?: string;
  /** dev → @capsuletech/* = workspace:* (внутри capsule-репо); prod → latest (npm). */
  mode: CliMode;
}

export interface ScaffoldResult {
  name: string;
  targetDir: string;
}

const NAME_RE = /^[a-z][a-z0-9-]*$/;
const validateName = (v: string) =>
  v && NAME_RE.test(v) ? undefined : 'строчные буквы, цифры и `-`, начинать с буквы';

export const scaffoldEntity = async ({
  kind,
  title,
  subDir,
  name: providedName,
  mode,
}: ScaffoldOptions): Promise<ScaffoldResult | undefined> => {
  const cwd = process.cwd();
  let targetDir = cwd;
  let name = basename(cwd);

  if (subDir) {
    const rootDir = join(cwd, subDir);
    if (!existsSync(rootDir)) {
      kit.log.warn(`Не вижу \`${subDir}/\` рядом — это не workspace.`);
      return;
    }

    if (providedName) {
      const err = validateName(providedName);
      if (err) {
        kit.log.error(`Имя «${providedName}»: ${err}`);
        if (isCi()) process.exit(1);
        return;
      }
      name = providedName;
    } else {
      if (isCi()) {
        kit.log.error(`name required in CI mode — pass it as a positional argument`);
        process.exit(1);
      }
      const input = await kit.input(
        `Имя ${title.toLowerCase()} (kebab-case)`,
        `my-${kind}`,
        (v) => validateName(v) ?? '',
      );
      if (!input) return;
      name = input as string;
    }

    targetDir = join(rootDir, name);
    if (existsSync(targetDir)) {
      kit.log.error(`${subDir}/${name} уже существует`);
      return;
    }
  } else {
    const conflicts = readdirSync(cwd).filter((f) => !IGNORED_ENTRIES.has(f));
    if (conflicts.length > 0) {
      if (isCi()) {
        kit.log.error(
          `directory not empty (${conflicts.length} entries), refusing to overwrite in CI mode — clean the directory before running the fixture`,
        );
        process.exit(1);
      }
      const ok = await kit.confirm(
        `В папке уже ${conflicts.length} элементов. Скаффолдить поверх?`,
      );
      if (!ok) return;
    }
  }

  const sourceDir = TEMPLATES[kind];
  if (!existsSync(sourceDir)) {
    kit.log.error(`Шаблон не найден: ${sourceDir}`);
    return;
  }

  const cap = mode === 'dev' ? 'workspace:*' : 'latest';

  await kit.task(`Скаффолд ${subDir ? `${subDir}/${name}` : `workspace «${name}»`}`, async () => {
    await generateFromTemplates({
      name,
      sourceDir,
      targetDir,
      vars: { dot: '.', cap },
    });
  });

  // generateFromTemplates ловит ошибки и просто пишет в console — проверяем что
  // целевая папка реально появилась, иначе нет смысла гнать pnpm install.
  if (!existsSync(targetDir)) {
    kit.log.error(`Скаффолд не создал ${targetDir} — прерываюсь.`);
    return;
  }

  const installCwd = kind === 'workspace' ? targetDir : cwd;
  await kit.task('pnpm install', async () => {
    const ciMode = isCi();
    const r = await execa('pnpm', ['install'], {
      cwd: installCwd,
      // CI: inherit so the parent process (smoke test) sees all output directly.
      // TUI: capture into buffers so we can surface them on failure without
      //      polluting the spinner output on success.
      stdio: ciMode ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      reject: false,
    });
    if (r.failed || r.exitCode !== 0) {
      if (!ciMode) {
        // Flush captured output so the user/log sees the real error.
        if (r.stderr) process.stderr.write(r.stderr);
        if (r.stdout) process.stdout.write(r.stdout);
      }
      kit.log.error(`pnpm install failed (exit ${r.exitCode ?? 'unknown'})`);
      process.exit(1);
    }
  });

  return { name, targetDir };
};
