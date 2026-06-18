import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CommandAction } from '../commands/types';
import { kit } from '../kit';
import { cvd } from '../utils';

/**
 * Минималистичный KEY=VALUE parser для `docker/preview-server/.env`.
 * НЕ тащим dotenv: формат фиксированный (single source of truth — см. ADR 024),
 * dotenv-expand/quote-rules не нужны. Игнорим пустые строки и `#`-комментарии,
 * сплит по ПЕРВОМУ `=` (значение может содержать `=`), trim ключа и значения,
 * снимаем парные ASCII-кавычки на концах.
 */
export const parseDotEnv = (text: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
};

/**
 * Приоритет резолва: CLI-флаг > process.env > `.env` > undefined.
 * Возвращаем undefined без fail'а — fail-сообщение нужно дать на верхнем
 * уровне с учётом сразу обоих недостающих ключей.
 */
export const resolveDeployVar = (
  paramValue: unknown,
  envName: string,
  dotenv: Record<string, string>,
): string | undefined => {
  if (typeof paramValue === 'string' && paramValue.length > 0) return paramValue;
  const fromEnv = process.env[envName];
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  const fromDotenv = dotenv[envName];
  if (fromDotenv && fromDotenv.length > 0) return fromDotenv;
  return undefined;
};

const ENV_PATH = ['docker', 'preview-server', '.env'];
const SCRIPT_PATH = ['scripts', 'deploy-preview.mjs'];

interface IDeploySection {
  root?: boolean;
  mocks?: boolean;
}

/** CLI-флаг > значение в `capsule.config.ts:deploy`. */
const pickBool = (paramValue: unknown, configValue: boolean | undefined): boolean => {
  if (typeof paramValue === 'boolean') return paramValue;
  return configValue === true;
};

export const deploy: CommandAction = async (ctx, params) => {
  if (ctx.type !== 'app' || !ctx.root) {
    kit.log.error('capsule deploy запускается только внутри apps/<name>/');
    return;
  }

  // Дефолты из docker/preview-server/.env — single source of truth по ADR 024.
  // Файла может не быть (закрытый контур, юзер передаст --server/--token явно).
  const envFile = join(ctx.root, ...ENV_PATH);
  const dotenv = existsSync(envFile) ? parseDotEnv(readFileSync(envFile, 'utf8')) : {};

  const server = resolveDeployVar(params.server, 'DEPLOY_SERVER', dotenv);
  const token = resolveDeployVar(params.token, 'DEPLOY_TOKEN', dotenv);

  const missing: string[] = [];
  if (!server) missing.push('DEPLOY_SERVER (или --server=<url>)');
  if (!token) missing.push('DEPLOY_TOKEN (или --token=<t>)');
  if (missing.length) {
    kit.log.error(
      `не задано: ${missing.join(', ')}.\n` +
        `Заполни ${join('docker', 'preview-server', '.env')} в корне репо ` +
        `или передай флагами/env.`,
    );
    process.exit(1);
    return;
  }

  // Семантические свойства app (root/mocks) — из capsule.config.ts:deploy.
  // CLI-флаг override'ит конфиг. server/token/no-build/dist — runtime, не конфиг.
  let deploySection: IDeploySection = {};
  const configPath = join(ctx.cwd, 'capsule.config.ts');
  if (existsSync(configPath)) {
    try {
      const raw = (await cvd.importModule(configPath, ctx.root)) as {
        default?: { deploy?: IDeploySection };
        deploy?: IDeploySection;
      };
      const cfg = raw?.default ?? raw;
      deploySection = cfg?.deploy ?? {};
    } catch (e) {
      kit.log.warn(
        `не удалось прочитать deploy-секцию из capsule.config.ts: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // `--no-build` в commander → params.build === false. По умолчанию build = true.
  const noBuild = params.build === false;
  const mocks = pickBool(params.mocks, deploySection.mocks);
  const root = pickBool(params.root, deploySection.root);
  const dist = typeof params.dist === 'string' ? params.dist : undefined;

  const scriptArgs: string[] = [];
  if (noBuild) scriptArgs.push('--no-build');
  if (mocks) scriptArgs.push('--mocks');
  if (root) scriptArgs.push('--root');
  if (dist) scriptArgs.push(`--dist=${dist}`);

  const scriptPath = join(ctx.root, ...SCRIPT_PATH);
  if (!existsSync(scriptPath)) {
    kit.log.error(`не нашёл ${SCRIPT_PATH.join('/')} в ${ctx.root}`);
    process.exit(1);
    return;
  }

  // cwd = ctx.cwd: скрипт авто-определяет app из cwd через `/apps/<name>/`.
  // Server/token уезжают в env — скрипт читает их через process.env как и раньше.
  const child = spawn(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: ctx.cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      DEPLOY_SERVER: server,
      DEPLOY_TOKEN: token,
    },
  });

  await new Promise<void>((resolveP) => {
    child.on('exit', (code) => {
      if (code && code !== 0) process.exit(code);
      resolveP();
    });
  });
};
