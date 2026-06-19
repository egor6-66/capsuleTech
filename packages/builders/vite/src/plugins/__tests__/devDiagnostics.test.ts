import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Logger, ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  _devDiagnosticsTestUtils,
  createDevDiagnosticsPlugin,
  type IDevDiagnostic,
} from '../devDiagnostics';

/**
 * Tests for DevDiagnosticsPlugin.
 *
 * Brief: docs/_meta/briefs/dev-diagnostics-stream.md
 *
 * Coverage:
 *  - parseTscLine: valid lines + preamble + summary
 *  - isTscCycleEnd: end-marker detection
 *  - emit: write, dedup, multi-emit
 *  - clearFor: per-type+file cleanup
 *  - reset: full truncate
 *  - JSONL format: log parseable
 *  - configureServer: truncates on start
 *  - Logger override: extracts file from message
 *
 * Out of scope (smoke / integration):
 *  - Real tsc --watch spawn (slow, brittle on CI without tsconfig)
 *  - Real Vite server boot (covered by manual smoke in PR description)
 */

const { parseTscLine, isTscCycleEnd, dedupeKey, normalizeFile } = _devDiagnosticsTestUtils;

describe('parseTscLine', () => {
  it('parses error line with file:line:col', () => {
    const r = parseTscLine(
      "src/foo.ts(10,5): error TS2322: Type 'X' is not assignable to type 'Y'.",
    );
    expect(r).toEqual({
      file: 'src/foo.ts',
      line: 10,
      col: 5,
      severity: 'error',
      code: 'TS2322',
      message: "Type 'X' is not assignable to type 'Y'.",
    });
  });

  it('parses warning as warn severity', () => {
    const r = parseTscLine('src/foo.ts(1,1): warning TS6133: Unused.');
    expect(r?.severity).toBe('warn');
  });

  it('returns null for tsc preamble', () => {
    expect(parseTscLine('[10:30:00] Starting compilation in watch mode...')).toBeNull();
  });

  it('returns null for tsc cycle-end summary', () => {
    expect(parseTscLine('Found 0 errors. Watching for file changes.')).toBeNull();
  });

  it('returns null for blank line', () => {
    expect(parseTscLine('')).toBeNull();
  });
});

describe('isTscCycleEnd', () => {
  it('recognizes "Found 0 errors"', () => {
    expect(isTscCycleEnd('Found 0 errors. Watching for file changes.')).toBe(true);
  });

  it('recognizes "Found 5 errors"', () => {
    expect(isTscCycleEnd('[10:30:00] Found 5 errors. Watching for file changes.')).toBe(true);
  });

  it('does not match "found 0" lowercase plain text', () => {
    expect(isTscCycleEnd('error TS2322: found 0 candidates')).toBe(false);
  });
});

describe('dedupeKey', () => {
  it('produces same key for identical diagnostics', () => {
    const d: IDevDiagnostic = {
      ts: 1,
      type: 'ts',
      severity: 'error',
      file: 'src/a.ts',
      line: 1,
      col: 1,
      code: 'TS123',
      message: 'oops',
    };
    expect(dedupeKey(d)).toBe(dedupeKey({ ...d, ts: 999 }));
  });

  it('produces different key for different line', () => {
    const base: IDevDiagnostic = {
      ts: 1,
      type: 'ts',
      severity: 'error',
      file: 'a',
      line: 1,
      message: 'x',
    };
    expect(dedupeKey(base)).not.toBe(dedupeKey({ ...base, line: 2 }));
  });

  it('produces different key for different type', () => {
    const base: IDevDiagnostic = {
      ts: 1,
      type: 'ts',
      severity: 'error',
      file: 'a',
      line: 1,
      message: 'x',
    };
    expect(dedupeKey(base)).not.toBe(dedupeKey({ ...base, type: 'compliance' }));
  });
});

describe('normalizeFile', () => {
  const root = process.platform === 'win32' ? 'C:/work/repo' : '/work/repo';

  it('converts absolute path to relative forward-slash', () => {
    const abs = process.platform === 'win32' ? 'C:\\work\\repo\\src\\a.ts' : '/work/repo/src/a.ts';
    expect(normalizeFile(abs, root)).toBe('src/a.ts');
  });

  it('keeps relative path as forward-slash', () => {
    expect(normalizeFile('src/a.ts', root)).toBe('src/a.ts');
  });
});

describe('createDevDiagnosticsPlugin', () => {
  let tmp: string;
  let logFile: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'dev-diagnostics-'));
    logFile = join(tmp, '.capsule', 'dev-diagnostics.log');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  const make = () =>
    createDevDiagnosticsPlugin({
      workspaceRoot: tmp,
      appRoot: tmp,
      logFile,
      disableTs: true,
    });

  const readLog = (): IDevDiagnostic[] => {
    if (!existsSync(logFile)) return [];
    const raw = readFileSync(logFile, 'utf8');
    return raw
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as IDevDiagnostic);
  };

  it('exposes plugin and state', () => {
    const { plugin, state } = make();
    expect(plugin.name).toBe('capsule-dev-diagnostics');
    expect(plugin.apply).toBe('serve');
    expect(typeof state.emit).toBe('function');
    expect(typeof state.clearFor).toBe('function');
    expect(typeof state.reset).toBe('function');
  });

  it('emit writes a record as JSONL', () => {
    const { state } = make();
    state.emit({
      ts: 1718900000000,
      type: 'compliance',
      severity: 'warn',
      file: join(tmp, 'src/foo.ts'),
      line: 9,
      col: 23,
      code: 'raw-class',
      message: 'classes on kit primitives forbidden',
    });
    const log = readLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      type: 'compliance',
      severity: 'warn',
      file: 'src/foo.ts',
      line: 9,
      col: 23,
      code: 'raw-class',
    });
  });

  it('emit dedupes identical diagnostics', () => {
    const { state } = make();
    const d: IDevDiagnostic = {
      ts: 1,
      type: 'ts',
      severity: 'error',
      file: 'src/a.ts',
      line: 5,
      col: 3,
      code: 'TS2322',
      message: 'mismatch',
    };
    state.emit(d);
    state.emit({ ...d, ts: 999 }); // different ts, same content → dedup
    expect(readLog()).toHaveLength(1);
  });

  it('emit accepts array', () => {
    const { state } = make();
    state.emit([
      { ts: 1, type: 'compliance', severity: 'warn', file: 'src/a.ts', message: 'a' },
      { ts: 1, type: 'compliance', severity: 'warn', file: 'src/b.ts', message: 'b' },
    ]);
    expect(readLog()).toHaveLength(2);
  });

  it('clearFor removes records of matching type+file', () => {
    const { state } = make();
    state.emit([
      { ts: 1, type: 'ts', severity: 'error', file: 'src/a.ts', line: 1, message: 'a1' },
      { ts: 1, type: 'ts', severity: 'error', file: 'src/a.ts', line: 2, message: 'a2' },
      { ts: 1, type: 'ts', severity: 'error', file: 'src/b.ts', line: 1, message: 'b1' },
      { ts: 1, type: 'compliance', severity: 'warn', file: 'src/a.ts', line: 1, message: 'ca' },
    ]);
    expect(readLog()).toHaveLength(4);

    state.clearFor('ts', join(tmp, 'src/a.ts'));
    const log = readLog();
    expect(log).toHaveLength(2); // ts:b.ts + compliance:a.ts left
    expect(log.find((r) => r.type === 'ts' && r.file === 'src/b.ts')).toBeDefined();
    expect(log.find((r) => r.type === 'compliance' && r.file === 'src/a.ts')).toBeDefined();
  });

  it('clearFor allows re-emit (key removed from dedup-set)', () => {
    const { state } = make();
    const d: IDevDiagnostic = {
      ts: 1,
      type: 'ts',
      severity: 'error',
      file: 'src/a.ts',
      line: 1,
      message: 'x',
    };
    state.emit(d);
    state.clearFor('ts', join(tmp, 'src/a.ts'));
    expect(readLog()).toHaveLength(0);
    state.emit(d);
    expect(readLog()).toHaveLength(1);
  });

  it('reset truncates log', () => {
    const { state } = make();
    state.emit({ ts: 1, type: 'ts', severity: 'error', file: 'a', message: 'x' });
    expect(readLog()).toHaveLength(1);
    state.reset();
    expect(readLog()).toHaveLength(0);
  });

  it('configureServer truncates existing log', async () => {
    const { plugin, state } = make();
    state.emit({ ts: 1, type: 'ts', severity: 'error', file: 'a', message: 'leftover' });
    expect(readLog()).toHaveLength(1);

    // Mock minimal ViteDevServer
    const noopLogger: Logger = {
      info: () => {},
      warn: () => {},
      warnOnce: () => {},
      error: () => {},
      clearScreen: () => {},
      hasErrorLogged: () => false,
      hasWarned: false,
    };
    const mockServer = {
      config: { logger: noopLogger },
      httpServer: null,
    } as unknown as ViteDevServer;

    // configureServer may be a function or { handler }
    const hook = plugin.configureServer;
    const handler = typeof hook === 'function' ? hook : hook?.handler;
    expect(handler).toBeDefined();
    await handler!.call({} as never, mockServer);

    expect(readLog()).toHaveLength(0);
  });

  it('Logger override extracts file from vite error message', async () => {
    const { plugin, state } = make();
    let capturedError: string | null = null;
    const logger: Logger = {
      info: () => {},
      warn: () => {},
      warnOnce: () => {},
      error: (msg: string) => {
        capturedError = msg;
      },
      clearScreen: () => {},
      hasErrorLogged: () => false,
      hasWarned: false,
    };
    const mockServer = {
      config: { logger },
      httpServer: null,
    } as unknown as ViteDevServer;

    const hook = plugin.configureServer;
    const handler = typeof hook === 'function' ? hook : hook?.handler;
    await handler!.call({} as never, mockServer);

    // After configureServer runs, server.config.logger.error is replaced.
    // Note: we use a forward-slash absolute path for the file so the regex
    // (which anchors on `/path`) matches on both win32 and posix.
    const filePath = '/work/foo/src/bad.ts';
    logger.error(`[plugin:vite] Transform failed at ${filePath}:42:1: oops`);

    expect(capturedError).toContain('Transform failed');
    const log = readLog();
    expect(log).toHaveLength(1);
    expect(log[0].type).toBe('vite');
    expect(log[0].severity).toBe('error');
    expect(log[0].message).toContain('Transform failed');
  });

  it('writes JSONL — each line is independently parseable', () => {
    const { state } = make();
    state.emit([
      { ts: 1, type: 'compliance', severity: 'warn', file: 'a', message: 'one' },
      { ts: 2, type: 'ts', severity: 'error', file: 'b', message: 'two' },
      { ts: 3, type: 'vite', severity: 'error', file: 'c', message: 'three' },
    ]);
    const raw = readFileSync(logFile, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim());
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});
