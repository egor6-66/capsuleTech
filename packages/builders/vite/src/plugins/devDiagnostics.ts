// devDiagnostics.ts — DevDiagnosticsPlugin: единый поток dev-диагностики в JSONL.
//
// Контекст: agent (главный assistant) судит по памяти и тексту в файле, а не по
// реальности компиляции. Real diagnostics существуют (Vite Logger, Compliance, tsc) —
// но не попадают в context agent'а автоматически. SessionStart-хук (Часть B этого
// брифа) подцепит этот файл через Monitor и каждая новая строка лога станет
// notification'ом в context'е.
//
// Файл: <capsuleRoot>/dev-diagnostics.log (рядом с registry/, routes/).
// Формат: JSONL — одна строка = одна диагностика.
// Truncate: на старте dev-server'а файл обнуляется.
//
// Sources в v1:
//   1. Compliance — через ICompliancePluginOptions.onDiagnostic callback.
//   2. Vite resolve/transform errors — через override Logger.error/warn.
//   3. TS — через `tsc --noEmit --watch` child process с парсингом stdout.
//
// Dedup: in-memory Set<(file,type,line,col,code,message)>. Повторно не пишем.
// Cleanup: при clean compile файла (compliance — per-file, tsc — per-cycle).
// Rotation: не нужна — truncate при старте достаточно.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import type { Plugin, Logger } from 'vite';

export type DiagnosticType = 'ts' | 'compliance' | 'vite';
export type DiagnosticSeverity = 'error' | 'warn';

/**
 * Одна запись в `.capsule/dev-diagnostics.log`. JSONL — одна строка на запись.
 * Все пути нормализованы относительно `workspaceRoot` для портативности
 * (SessionStart-хук может находиться в разных cwd).
 */
export interface IDevDiagnostic {
  /** Unix ms — момент эмита, не reception'а на стороне agent'а. */
  ts: number;
  type: DiagnosticType;
  severity: DiagnosticSeverity;
  /** Относительный путь от workspaceRoot, forward-slash. */
  file: string;
  line?: number;
  col?: number;
  /** Source-specific error code: 'TS2322', 'raw-class', 'transform-failed' и т.п. */
  code?: string;
  message: string;
}

export interface IDevDiagnosticsState {
  /** Эмит одной или нескольких диагностик. Дедуп по hash; cleanup внешний. */
  emit(d: IDevDiagnostic | IDevDiagnostic[]): void;
  /**
   * Очистить все записи указанного типа для конкретного файла.
   * Вызывается consumer'ом когда checker подтвердил «файл чист по этому типу».
   * Для compliance — per-file (после каждого transform).
   * Для ts — после каждого compile cycle'а (для файлов которые были в прошлом
   * cycle'е, но не в текущем).
   */
  clearFor(type: DiagnosticType, file: string): void;
  /** Полная очистка лога. Только на shutdown / тестах. */
  reset(): void;
}

export interface IDevDiagnosticsPluginOptions {
  /** Корень workspace (для relative-путей в записях). Обычно — capsule monorepo root. */
  workspaceRoot: string;
  /** Корень app'а (для tsc --watch cwd + Logger context). */
  appRoot: string;
  /**
   * Путь к log-файлу. По умолчанию `<capsuleRoot>/dev-diagnostics.log`.
   * Тест может перенаправить в tmpdir.
   */
  logFile?: string;
  /**
   * Отключить tsc child process (для тестов или если tsc уже запущен иначе).
   * Default: false (tsc включён).
   */
  disableTs?: boolean;
}

interface IPluginInternals {
  plugin: Plugin;
  state: IDevDiagnosticsState;
}

const dedupeKey = (d: IDevDiagnostic): string =>
  `${d.type}|${d.file}|${d.line ?? '-'}|${d.col ?? '-'}|${d.code ?? '-'}|${d.message}`;

/** Нормализует путь до относительного forward-slash относительно workspaceRoot. */
const normalizeFile = (file: string, workspaceRoot: string): string => {
  const abs = isAbsolute(file) ? file : resolve(workspaceRoot, file);
  const rel = relative(workspaceRoot, abs);
  return rel.replace(/\\/g, '/');
};

/**
 * Парсит одну tsc-строку формата `path/to/file.ts(10,5): error TS2322: message`.
 * Возвращает null если строка не подходит (preamble, blank, summary).
 */
const parseTscLine = (line: string): {
  file: string;
  line: number;
  col: number;
  severity: DiagnosticSeverity;
  code: string;
  message: string;
} | null => {
  // tsc summary: "Found 0 errors. Watching for file changes."
  // tsc preamble: "[hh:mm:ss] Starting compilation..."
  // tsc error: "src/foo.ts(10,5): error TS2322: Type 'X' is not assignable..."
  const m = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/);
  if (!m) return null;
  const [, file, lineStr, colStr, sev, code, message] = m;
  return {
    file,
    line: Number(lineStr),
    col: Number(colStr),
    severity: sev === 'error' ? 'error' : 'warn',
    code,
    message: message.trim(),
  };
};

/** Маркер конца cycle'а от tsc --watch — "Found N error(s)." */
const isTscCycleEnd = (line: string): boolean => /Found\s+\d+\s+errors?\b/i.test(line);

export const createDevDiagnosticsPlugin = (
  opts: IDevDiagnosticsPluginOptions,
): IPluginInternals => {
  const { workspaceRoot, appRoot, disableTs = false } = opts;
  const logFile = opts.logFile ?? resolve(appRoot, '.capsule', 'dev-diagnostics.log');

  // In-memory storage для dedup + cleanup. Source of truth для лога.
  // Записи группируются по `${type}|${file}` для быстрого clearFor.
  const records: IDevDiagnostic[] = [];
  const seenKeys = new Set<string>();

  // TS cycle tracking — какие файлы попали в текущий cycle.
  // На end-of-cycle: для файлов которые БЫЛИ в логе как 'ts' но НЕ в этом cycle'е —
  // вызываем clearFor (значит они стали чистыми).
  let currentTsCycleFiles = new Set<string>();
  let tsProc: ChildProcess | null = null;

  const flush = (): void => {
    const dir = dirname(logFile);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const content = records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : '');
    writeFileSync(logFile, content, 'utf8');
  };

  const truncate = (): void => {
    records.length = 0;
    seenKeys.clear();
    currentTsCycleFiles.clear();
    flush();
  };

  const state: IDevDiagnosticsState = {
    emit(d) {
      const list = Array.isArray(d) ? d : [d];
      let changed = false;
      for (const raw of list) {
        const normalized: IDevDiagnostic = { ...raw, file: normalizeFile(raw.file, workspaceRoot) };
        const key = dedupeKey(normalized);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        records.push(normalized);
        changed = true;
      }
      if (changed) flush();
    },
    clearFor(type, file) {
      const normalized = normalizeFile(file, workspaceRoot);
      let removed = false;
      for (let i = records.length - 1; i >= 0; i--) {
        const r = records[i];
        if (r.type === type && r.file === normalized) {
          seenKeys.delete(dedupeKey(r));
          records.splice(i, 1);
          removed = true;
        }
      }
      if (removed) flush();
    },
    reset() {
      truncate();
    },
  };

  // Парсер tsc-stdout (line-by-line). Накопитель текущего cycle'а.
  const onTscOutput = (chunk: string): void => {
    const lines = chunk.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = parseTscLine(line);
      if (parsed) {
        currentTsCycleFiles.add(normalizeFile(parsed.file, workspaceRoot));
        state.emit({
          ts: Date.now(),
          type: 'ts',
          severity: parsed.severity,
          file: parsed.file,
          line: parsed.line,
          col: parsed.col,
          code: parsed.code,
          message: parsed.message,
        });
      } else if (isTscCycleEnd(line)) {
        // End of cycle: clear ts-entries for files that disappeared since last cycle.
        const stale = records
          .filter((r) => r.type === 'ts' && !currentTsCycleFiles.has(r.file))
          .map((r) => r.file);
        for (const f of new Set(stale)) {
          state.clearFor('ts', resolve(workspaceRoot, f));
        }
        currentTsCycleFiles = new Set();
      }
    }
  };

  const startTsc = (): void => {
    if (disableTs || tsProc) return;
    // `tsc --noEmit --watch --pretty false --preserveWatchOutput` — стабильный
    // машино-парсимый output. Запускаем от appRoot (там tsconfig.json app'а).
    const tscCmd = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
    try {
      tsProc = spawn(
        tscCmd,
        ['--noEmit', '--watch', '--pretty', 'false', '--preserveWatchOutput'],
        { cwd: appRoot, shell: process.platform === 'win32', windowsHide: true },
      );
      tsProc.stdout?.on('data', (b: Buffer) => onTscOutput(b.toString('utf8')));
      tsProc.stderr?.on('data', (b: Buffer) => onTscOutput(b.toString('utf8')));
      tsProc.on('error', () => {
        // tsc не нашёлся — silent fail, остальные источники работают.
        tsProc = null;
      });
    } catch {
      tsProc = null;
    }
  };

  const stopTsc = (): void => {
    if (!tsProc) return;
    tsProc.kill();
    tsProc = null;
  };

  const plugin: Plugin = {
    name: 'capsule-dev-diagnostics',
    apply: 'serve',
    configureServer(server) {
      // Truncate at start — не таскаем вчерашние ошибки между сессиями.
      truncate();

      // Override Logger error/warn — Vite resolve/transform errors попадают сюда.
      // Сохраняем оригиналы, делаем passthrough + эмит в наш лог.
      const origLogger: Logger = server.config.logger;
      const origError = origLogger.error.bind(origLogger);
      const origWarn = origLogger.warn.bind(origLogger);

      const extractFileFromMsg = (msg: string): string | undefined => {
        // Vite error message typically contains "at /abs/path:line:col" or
        // "[plugin xxx] /abs/path:line:col: details". Best-effort extraction.
        const m = msg.match(/(?:^|[\s\[(])((?:[A-Za-z]:)?\/[^\s:()]+\.[a-zA-Z]+)(?::(\d+))?(?::(\d+))?/);
        if (!m) return undefined;
        return m[1];
      };

      origLogger.error = (msg: string, options) => {
        const file = extractFileFromMsg(msg) ?? '<unknown>';
        state.emit({
          ts: Date.now(),
          type: 'vite',
          severity: 'error',
          file: file === '<unknown>' ? appRoot : file,
          code: 'vite-error',
          message: msg.replace(/\x1b\[[0-9;]*m/g, '').trim(),
        });
        return origError(msg, options);
      };
      origLogger.warn = (msg: string, options) => {
        // Vite печатает много info-уровня через warn (HMR update, etc).
        // Фильтр: пишем только если есть file:line — иначе шум.
        const file = extractFileFromMsg(msg);
        if (file) {
          state.emit({
            ts: Date.now(),
            type: 'vite',
            severity: 'warn',
            file,
            code: 'vite-warn',
            message: msg.replace(/\x1b\[[0-9;]*m/g, '').trim(),
          });
        }
        return origWarn(msg, options);
      };

      // Spawn tsc --watch (не блокирует ready, идёт background'ом).
      startTsc();

      // Очистка на closeBundle / server close.
      server.httpServer?.once('close', () => {
        stopTsc();
      });
    },
    closeBundle() {
      stopTsc();
    },
  };

  return { plugin, state };
};

/**
 * Простой helper для тестов: проверка что в логе есть запись с заданными полями.
 * Экспортится из barrel'а только в тестовой сборке (через ts-paths).
 */
export const _devDiagnosticsTestUtils = {
  parseTscLine,
  isTscCycleEnd,
  dedupeKey,
  normalizeFile,
};
