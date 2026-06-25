import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CommandAction } from '../commands/types';
import { kit } from '../kit';
import { cvd } from '../utils';

/**
 * Vendoring контракта ремоута (ADR 060 Phase 2 / D4).
 *
 * Host НЕ live-fetch'ит контракт на каждом билде (MF failure-mode: prod-гейт +
 * оффлайн ломают сборку). Вместо этого `capsule remote sync` явным user-action'ом
 * фетчит артефакт-снапшот (как lockfile) и пишет в **коммитимую** папку
 * `apps/<app>/remotes/<name>/`. Дальше codegen (Phase 2 builders) типизирует из неё.
 *
 * cli непрозрачен для содержимого контракта — только fetch + write, никакой
 * бизнес-логики. `manifest.version` используется лишь для version-skew лога.
 */

/** Файлы, из которых состоит vendored-снапшот контракта ремоута. */
export const CONTRACT_FILES = [
  'manifest.json',
  'schema.json',
  'contract.d.ts',
  'contract.mjs',
] as const;

const DEFAULT_TIMEOUT_MS = 15_000;

/** Одна запись `remotes[]` из `capsule.app.ts` (структурно, без рантайм-импорта). */
export interface RemoteEntry {
  name: string;
  url: string;
  contract?: string;
}

/** Минимальный логгер — совместим с `kit.log` (clack) и тривиально мокается в тестах. */
export interface SyncLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  success: (msg: string) => void;
}

export interface SyncRemotesOptions {
  /** Реестр ремоутов из `capsule.app.ts → remotes`. */
  remotes: readonly RemoteEntry[];
  /** Корень приложения — vendored-файлы лягут в `<appRoot>/remotes/<name>/`. */
  appRoot: string;
  /** Синхронизировать только этот ремоут по имени (CLI-позиционник). */
  only?: string;
  /** Инъектируемый фетчер (тело как текст). Дефолт — global `fetch` + таймаут. */
  fetchFile?: (url: string) => Promise<string>;
  /** Инъектируемый логгер. Дефолт — `kit.log`. */
  log?: SyncLogger;
  /** Таймаут одного запроса, мс. */
  timeoutMs?: number;
}

export interface SyncedRemote {
  name: string;
  oldVersion: string | null;
  newVersion: string | null;
}

/** Источник контракт-артефакта: явный `contract` или `${url}/.capsule/contract`. */
const contractSource = (remote: RemoteEntry): string => {
  const base = remote.contract ?? `${remote.url.replace(/\/+$/, '')}/.capsule/contract`;
  return base.replace(/\/+$/, '');
};

/** Дефолтный фетчер: global `fetch` + AbortController-таймаут, понятная ошибка. */
const makeDefaultFetcher =
  (timeoutMs: number) =>
  async (url: string): Promise<string> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`таймаут ${timeoutMs}ms`);
      }
      throw err instanceof Error ? err : new Error(String(err));
    } finally {
      clearTimeout(timer);
    }
  };

/** Достаёт `version` из manifest.json-текста; null если файла нет/не парсится. */
const readManifestVersion = (text: string | undefined): string | null => {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : null;
  } catch {
    return null;
  }
};

/**
 * Ядро vendoring'а. Для каждого ремоута:
 *  1. фетчит все 4 файла **в память** (atomic: при ошибке любого — throw до записи,
 *     старые vendored-файлы остаются нетронутыми, битого частичного состояния нет);
 *  2. читает старую `manifest.version` для skew-лога;
 *  3. mkdir + пишет 4 файла в `<appRoot>/remotes/<name>/`.
 *
 * Бросает с понятным сообщением, если источник недоступен/404/таймаут.
 * Возвращает сводку (имя + old→new версии) для diff-намёка.
 */
export const syncRemotes = async (opts: SyncRemotesOptions): Promise<SyncedRemote[]> => {
  const { remotes, appRoot, only } = opts;
  const log = opts.log ?? kit.log;
  const fetchFile = opts.fetchFile ?? makeDefaultFetcher(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const selected = only ? remotes.filter((r) => r.name === only) : remotes;
  if (only && selected.length === 0) {
    throw new Error(
      `Ремоут "${only}" не найден в capsule.app.ts → remotes (есть: ${
        remotes.map((r) => r.name).join(', ') || '—'
      }).`,
    );
  }

  const synced: SyncedRemote[] = [];

  for (const remote of selected) {
    const source = contractSource(remote);

    // 1. Фетч всех файлов в память — до первой записи на диск.
    const contents: Record<string, string> = {};
    for (const file of CONTRACT_FILES) {
      const url = `${source}/${file}`;
      try {
        contents[file] = await fetchFile(url);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`remote "${remote.name}": не удалось зафетчить ${url} — ${reason}`);
      }
    }

    // 2. Старая версия (если уже вендорили) — для skew-лога.
    const targetDir = join(appRoot, 'remotes', remote.name);
    const oldManifestPath = join(targetDir, 'manifest.json');
    const oldVersion = existsSync(oldManifestPath)
      ? readManifestVersion(readFileSync(oldManifestPath, 'utf8'))
      : null;
    const newVersion = readManifestVersion(contents['manifest.json']);

    // 3. Запись (всё в памяти валидно — пишем атомарно весь набор).
    mkdirSync(targetDir, { recursive: true });
    for (const file of CONTRACT_FILES) {
      writeFileSync(join(targetDir, file), contents[file], 'utf8');
    }

    if (oldVersion && newVersion && oldVersion !== newVersion) {
      log.warn(`${remote.name}: contract ${oldVersion} → ${newVersion} (version skew)`);
    } else {
      log.info(`${remote.name}: contract ${newVersion ?? '?'} (4 файла)`);
    }
    log.info(`  ${remotePath(remote.name)} ← ${source}`);

    synced.push({ name: remote.name, oldVersion, newVersion });
  }

  return synced;
};

const remotePath = (name: string): string => `remotes/${name}/`;

/**
 * `capsule remote sync [name?]` — вендоринг контракта ремоута(ов).
 *
 * Читает `apps/<app>/capsule.app.ts → remotes` (jiti), фетчит для каждого 4 файла
 * контракт-артефакта и пишет в коммитимую `apps/<app>/remotes/<name>/`. Нет
 * `remotes` — no-op. Контракт-fetch — explicit user-action, НЕ автозапуск на build.
 */
export const remoteSync: CommandAction = async (ctx, params) => {
  if (ctx.type !== 'app' || !ctx.root) {
    kit.log.error('remote sync запускается только внутри apps/<name>/');
    return;
  }

  const configPath = join(ctx.cwd, 'capsule.app.ts');
  if (!existsSync(configPath)) {
    kit.log.error('Не нашёл capsule.app.ts');
    return;
  }

  const rawConfig = (await cvd.importModule(configPath, ctx.root)) as { default?: unknown };
  const userConfig = (rawConfig?.default ?? rawConfig) as { remotes?: readonly RemoteEntry[] };
  const remotes = userConfig?.remotes ?? [];

  if (remotes.length === 0) {
    kit.log.info('В capsule.app.ts нет `remotes` — нечего синхронизировать.');
    return;
  }

  const only = typeof params.name === 'string' && params.name ? params.name : undefined;

  const synced = await syncRemotes({ remotes, appRoot: ctx.cwd, only });
  kit.log.success(
    `Синхронизировано ремоутов: ${synced.length}. Закоммить папку remotes/ (vendored lockfile).`,
  );
  kit.log.info('Перезапусти `capsule dev` / `capsule build` для регенерации типов (remotes.d.ts).');
};
