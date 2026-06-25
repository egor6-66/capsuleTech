import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTRACT_FILES, type RemoteEntry, type SyncLogger, syncRemotes } from '../remote-sync';

const silentLog = (): SyncLogger => ({ info: vi.fn(), warn: vi.fn(), success: vi.fn() });

/** Фетчер-фикстура: отдаёт детерминированное содержимое по имени файла. */
const fixtureFetch =
  (version: string, fail?: (url: string) => boolean) =>
  async (url: string): Promise<string> => {
    if (fail?.(url)) throw new Error('ECONNREFUSED');
    if (url.endsWith('manifest.json')) return JSON.stringify({ version, name: 'shop' });
    if (url.endsWith('schema.json')) return JSON.stringify({ $schema: 'x' });
    if (url.endsWith('contract.d.ts')) return 'export interface Contract {}';
    if (url.endsWith('contract.mjs')) return 'export const contract = {};';
    throw new Error(`unexpected url ${url}`);
  };

const REMOTE: RemoteEntry = { name: 'shop', url: 'https://shop.example.com' };

describe('syncRemotes', () => {
  let appRoot: string;

  beforeEach(() => {
    appRoot = mkdtempSync(join(tmpdir(), 'capsule-remote-'));
  });

  afterEach(() => {
    rmSync(appRoot, { recursive: true, force: true });
  });

  it('пишет 4 файла контракта в remotes/<name>/', async () => {
    const result = await syncRemotes({
      remotes: [REMOTE],
      appRoot,
      fetchFile: fixtureFetch('1.0.0'),
      log: silentLog(),
    });

    const dir = join(appRoot, 'remotes', 'shop');
    for (const file of CONTRACT_FILES) {
      expect(existsSync(join(dir, file)), `${file} должен быть записан`).toBe(true);
    }
    expect(result).toEqual([{ name: 'shop', oldVersion: null, newVersion: '1.0.0' }]);
  });

  it('фетчит из url + /.capsule/contract по умолчанию', async () => {
    const seen: string[] = [];
    await syncRemotes({
      remotes: [REMOTE],
      appRoot,
      fetchFile: async (url) => {
        seen.push(url);
        return fixtureFetch('1.0.0')(url);
      },
      log: silentLog(),
    });
    expect(seen).toContain('https://shop.example.com/.capsule/contract/manifest.json');
  });

  it('уважает явный remote.contract как источник', async () => {
    const seen: string[] = [];
    await syncRemotes({
      remotes: [{ name: 'shop', url: 'https://shop.example.com', contract: 'https://cdn.x/c' }],
      appRoot,
      fetchFile: async (url) => {
        seen.push(url);
        return fixtureFetch('1.0.0')(url);
      },
      log: silentLog(),
    });
    expect(seen).toContain('https://cdn.x/c/manifest.json');
  });

  it('недоступный источник → понятная ошибка, без битой частичной записи', async () => {
    const log = silentLog();
    await expect(
      syncRemotes({
        remotes: [REMOTE],
        appRoot,
        // contract.d.ts (3-й файл) падает — два первых уже «получены» в память.
        fetchFile: fixtureFetch('1.0.0', (url) => url.endsWith('contract.d.ts')),
        log,
      }),
    ).rejects.toThrow(/remote "shop".*contract\.d\.ts.*ECONNREFUSED/);

    // Атомарность: ничего не записано (throw до mkdir/write).
    expect(existsSync(join(appRoot, 'remotes', 'shop'))).toBe(false);
  });

  it('логирует version-skew при смене версии существующего vendored-контракта', async () => {
    const dir = join(appRoot, 'remotes', 'shop');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ version: '1.0.0' }), 'utf8');

    const log = silentLog();
    const result = await syncRemotes({
      remotes: [REMOTE],
      appRoot,
      fetchFile: fixtureFetch('2.0.0'),
      log,
    });

    expect(result[0]).toEqual({ name: 'shop', oldVersion: '1.0.0', newVersion: '2.0.0' });
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('1.0.0 → 2.0.0'));
    // новое содержимое перезаписано
    expect(JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).version).toBe('2.0.0');
  });

  it('`only` синхронизирует один ремоут; неизвестное имя → понятная ошибка', async () => {
    const remotes: RemoteEntry[] = [REMOTE, { name: 'crm', url: 'https://crm.example.com' }];

    const result = await syncRemotes({
      remotes,
      appRoot,
      only: 'shop',
      fetchFile: fixtureFetch('1.0.0'),
      log: silentLog(),
    });
    expect(result.map((r) => r.name)).toEqual(['shop']);
    expect(existsSync(join(appRoot, 'remotes', 'crm'))).toBe(false);

    await expect(
      syncRemotes({
        remotes,
        appRoot,
        only: 'unknown',
        fetchFile: fixtureFetch('1.0.0'),
        log: silentLog(),
      }),
    ).rejects.toThrow(/Ремоут "unknown" не найден/);
  });

  it('пустой реестр remotes → no-op (ничего не пишет)', async () => {
    const result = await syncRemotes({ remotes: [], appRoot, fetchFile: fixtureFetch('1.0.0') });
    expect(result).toEqual([]);
    expect(existsSync(join(appRoot, 'remotes'))).toBe(false);
  });

  // Дефолтный путь (global fetch + таймаут) — реальный prod-путь, проверяем
  // против настоящего HTTP-сервера, не инжектируя fetchFile.
  it('дефолтный fetcher тянет артефакт по HTTP и пишет 4 файла', async () => {
    const bodies: Record<string, string> = {
      '/.capsule/contract/manifest.json': JSON.stringify({ version: '3.1.0' }),
      '/.capsule/contract/schema.json': '{}',
      '/.capsule/contract/contract.d.ts': 'export {}',
      '/.capsule/contract/contract.mjs': 'export const c = {}',
    };
    const server: Server = createServer((req, res) => {
      const body = bodies[req.url ?? ''];
      if (body === undefined) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      res.end(body);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const result = await syncRemotes({
        remotes: [{ name: 'shop', url: `http://127.0.0.1:${port}` }],
        appRoot,
        log: silentLog(),
      });
      expect(result[0]?.newVersion).toBe('3.1.0');
      const dir = join(appRoot, 'remotes', 'shop');
      for (const file of CONTRACT_FILES) {
        expect(existsSync(join(dir, file)), `${file} записан`).toBe(true);
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('дефолтный fetcher: 404 → понятная ошибка, без частичной записи', async () => {
    const server: Server = createServer((_req, res) => {
      res.statusCode = 404;
      res.end('nope');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;

    try {
      await expect(
        syncRemotes({
          remotes: [{ name: 'shop', url: `http://127.0.0.1:${port}` }],
          appRoot,
          log: silentLog(),
        }),
      ).rejects.toThrow(/HTTP 404/);
      expect(existsSync(join(appRoot, 'remotes', 'shop'))).toBe(false);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
